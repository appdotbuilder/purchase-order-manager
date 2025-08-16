import { db } from '../db';
import { costEstimatesTable, purchaseOrdersTable } from '../db/schema';
import { type CreateCostEstimateInput, type CostEstimate } from '../schema';
import { eq } from 'drizzle-orm';

export const createCostEstimate = async (input: CreateCostEstimateInput): Promise<CostEstimate> => {
  try {
    // Verify the purchase order exists and is in APPROVED status
    const purchaseOrders = await db.select()
      .from(purchaseOrdersTable)
      .where(eq(purchaseOrdersTable.id, input.purchase_order_id))
      .execute();

    if (purchaseOrders.length === 0) {
      throw new Error('Purchase order not found');
    }

    const purchaseOrder = purchaseOrders[0];
    if (purchaseOrder.status !== 'APPROVED') {
      throw new Error('Purchase order must be in APPROVED status to create cost estimates');
    }

    // Insert the cost estimate
    const result = await db.insert(costEstimatesTable)
      .values({
        purchase_order_id: input.purchase_order_id,
        title: input.title,
        description: input.description,
        created_by: 1, // TODO: Get from auth context when available
        status: 'DRAFT',
        total_cost: input.total_cost.toString() // Convert number to string for numeric column
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const costEstimate = result[0];
    return {
      ...costEstimate,
      total_cost: parseFloat(costEstimate.total_cost) // Convert string back to number
    };
  } catch (error) {
    console.error('Cost estimate creation failed:', error);
    throw error;
  }
};