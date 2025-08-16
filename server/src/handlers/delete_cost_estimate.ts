import { db } from '../db';
import { costEstimatesTable, costEstimateLineItemsTable } from '../db/schema';
import { type IdInput } from '../schema';
import { eq } from 'drizzle-orm';

export const deleteCostEstimate = async (input: IdInput): Promise<{ success: boolean }> => {
  try {
    // First, check if the cost estimate exists and get its status
    const costEstimate = await db.select()
      .from(costEstimatesTable)
      .where(eq(costEstimatesTable.id, input.id))
      .execute();

    if (costEstimate.length === 0) {
      throw new Error('Cost estimate not found');
    }

    // Check if status is DRAFT (only DRAFT cost estimates can be deleted)
    if (costEstimate[0].status !== 'DRAFT') {
      throw new Error('Only draft cost estimates can be deleted');
    }

    // Delete associated line items first (foreign key constraint)
    await db.delete(costEstimateLineItemsTable)
      .where(eq(costEstimateLineItemsTable.cost_estimate_id, input.id))
      .execute();

    // Delete the cost estimate
    const result = await db.delete(costEstimatesTable)
      .where(eq(costEstimatesTable.id, input.id))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Cost estimate deletion failed:', error);
    throw error;
  }
};