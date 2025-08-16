import { db } from '../db';
import { costEstimatesTable, purchaseOrdersTable } from '../db/schema';
import { type ApproveCostEstimateInput, type CostEstimate } from '../schema';
import { eq } from 'drizzle-orm';

export async function approveCostEstimate(input: ApproveCostEstimateInput): Promise<CostEstimate> {
  try {
    // First, verify the cost estimate exists and is in PENDING_APPROVAL status
    const existingEstimate = await db.select()
      .from(costEstimatesTable)
      .where(eq(costEstimatesTable.id, input.id))
      .execute();

    if (existingEstimate.length === 0) {
      throw new Error(`Cost estimate with id ${input.id} not found`);
    }

    const costEstimate = existingEstimate[0];

    if (costEstimate.status !== 'PENDING_APPROVAL') {
      throw new Error(`Cost estimate must be in PENDING_APPROVAL status to approve/reject. Current status: ${costEstimate.status}`);
    }

    // Update cost estimate status
    const newStatus = input.approved ? 'APPROVED' : 'REJECTED';
    
    const updatedEstimate = await db.update(costEstimatesTable)
      .set({
        status: newStatus,
        approved_by: 1, // In real implementation, this would come from auth context
        updated_at: new Date()
      })
      .where(eq(costEstimatesTable.id, input.id))
      .returning()
      .execute();

    // If approved, update the related purchase order status to PROGRESS
    if (input.approved) {
      await db.update(purchaseOrdersTable)
        .set({
          status: 'PROGRESS',
          updated_at: new Date()
        })
        .where(eq(purchaseOrdersTable.id, costEstimate.purchase_order_id))
        .execute();
    }

    // Convert numeric fields back to numbers before returning
    const result = updatedEstimate[0];
    return {
      ...result,
      total_cost: parseFloat(result.total_cost)
    };

  } catch (error) {
    console.error('Cost estimate approval failed:', error);
    throw error;
  }
}