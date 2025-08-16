import { db } from '../db';
import { costEstimatesTable, costEstimateLineItemsTable } from '../db/schema';
import { type UpdateCostEstimateInput, type CostEstimate } from '../schema';
import { eq, sum } from 'drizzle-orm';

export const updateCostEstimate = async (input: UpdateCostEstimateInput): Promise<CostEstimate> => {
  try {
    // First, verify the cost estimate exists
    const existingCostEstimate = await db.select()
      .from(costEstimatesTable)
      .where(eq(costEstimatesTable.id, input.id))
      .execute();

    if (existingCostEstimate.length === 0) {
      throw new Error('Cost estimate not found');
    }

    const currentCostEstimate = existingCostEstimate[0];

    // Check if status allows updates (only DRAFT status can be updated)
    if (currentCostEstimate.status !== 'DRAFT') {
      throw new Error('Can only update cost estimates with DRAFT status');
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.title !== undefined) {
      updateData.title = input.title;
    }

    if (input.description !== undefined) {
      updateData.description = input.description;
    }

    if (input.total_cost !== undefined) {
      updateData.total_cost = input.total_cost.toString(); // Convert number to string for numeric column
    }

    // Update the cost estimate
    const result = await db.update(costEstimatesTable)
      .set(updateData)
      .where(eq(costEstimatesTable.id, input.id))
      .returning()
      .execute();

    let finalCostEstimate = result[0];
    
    // If total_cost was not provided, recalculate from line items only if line items exist
    if (input.total_cost === undefined) {
      // Check if there are any line items
      const lineItemsCount = await db.select()
        .from(costEstimateLineItemsTable)
        .where(eq(costEstimateLineItemsTable.cost_estimate_id, input.id))
        .execute();

      // Only recalculate if there are line items
      if (lineItemsCount.length > 0) {
        const lineItemsTotal = await db.select({
          total: sum(costEstimateLineItemsTable.total_price)
        })
        .from(costEstimateLineItemsTable)
        .where(eq(costEstimateLineItemsTable.cost_estimate_id, input.id))
        .execute();

        const calculatedTotal = lineItemsTotal[0]?.total || '0';
        
        // Update with calculated total
        const updatedResult = await db.update(costEstimatesTable)
          .set({ 
            total_cost: calculatedTotal,
            updated_at: new Date()
          })
          .where(eq(costEstimatesTable.id, input.id))
          .returning()
          .execute();

        finalCostEstimate = updatedResult[0];
      }
    }

    // Convert numeric fields back to numbers before returning
    return {
      ...finalCostEstimate,
      total_cost: parseFloat(finalCostEstimate.total_cost)
    };
  } catch (error) {
    console.error('Cost estimate update failed:', error);
    throw error;
  }
};