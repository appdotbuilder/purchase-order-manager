import { db } from '../db';
import { costEstimateLineItemsTable, costEstimatesTable } from '../db/schema';
import { type UpdateCostEstimateLineItemInput, type CostEstimateLineItem } from '../schema';
import { eq, sql } from 'drizzle-orm';

export const updateCostEstimateLineItem = async (input: UpdateCostEstimateLineItemInput): Promise<CostEstimateLineItem> => {
  try {
    // Start transaction to ensure data consistency
    return await db.transaction(async (tx) => {
      // First, verify the line item exists and get current data
      const existingLineItem = await tx.select()
        .from(costEstimateLineItemsTable)
        .where(eq(costEstimateLineItemsTable.id, input.id))
        .execute();

      if (existingLineItem.length === 0) {
        throw new Error(`Cost estimate line item with id ${input.id} not found`);
      }

      const currentLineItem = existingLineItem[0];

      // Check if parent cost estimate is in DRAFT status
      const costEstimate = await tx.select()
        .from(costEstimatesTable)
        .where(eq(costEstimatesTable.id, currentLineItem.cost_estimate_id))
        .execute();

      if (costEstimate.length === 0) {
        throw new Error('Associated cost estimate not found');
      }

      if (costEstimate[0].status !== 'DRAFT') {
        throw new Error('Cannot update line item: cost estimate is not in DRAFT status');
      }

      // Build update data with only provided fields
      const updateData: Partial<typeof currentLineItem> = {};
      
      if (input.description !== undefined) {
        updateData.description = input.description;
      }
      
      if (input.quantity !== undefined) {
        updateData.quantity = input.quantity;
      }
      
      if (input.unit_price !== undefined) {
        updateData.unit_price = input.unit_price.toString(); // Convert to string for numeric column
      }

      // Calculate new total_price if quantity or unit_price changed
      const newQuantity = input.quantity !== undefined ? input.quantity : currentLineItem.quantity;
      const newUnitPrice = input.unit_price !== undefined ? input.unit_price : parseFloat(currentLineItem.unit_price);
      const newTotalPrice = newQuantity * newUnitPrice;
      
      updateData.total_price = newTotalPrice.toString(); // Convert to string for numeric column

      // Update the line item
      const updatedLineItem = await tx.update(costEstimateLineItemsTable)
        .set(updateData)
        .where(eq(costEstimateLineItemsTable.id, input.id))
        .returning()
        .execute();

      // Recalculate parent cost estimate's total_cost
      const allLineItems = await tx.select()
        .from(costEstimateLineItemsTable)
        .where(eq(costEstimateLineItemsTable.cost_estimate_id, currentLineItem.cost_estimate_id))
        .execute();

      const newTotalCost = allLineItems.reduce((sum, item) => {
        return sum + parseFloat(item.total_price);
      }, 0);

      // Update parent cost estimate's total_cost and updated_at
      await tx.update(costEstimatesTable)
        .set({ 
          total_cost: newTotalCost.toString(), // Convert to string for numeric column
          updated_at: sql`now()`
        })
        .where(eq(costEstimatesTable.id, currentLineItem.cost_estimate_id))
        .execute();

      // Return the updated line item with numeric conversions
      const result = updatedLineItem[0];
      return {
        ...result,
        unit_price: parseFloat(result.unit_price), // Convert back to number
        total_price: parseFloat(result.total_price) // Convert back to number
      };
    });
  } catch (error) {
    console.error('Cost estimate line item update failed:', error);
    throw error;
  }
};