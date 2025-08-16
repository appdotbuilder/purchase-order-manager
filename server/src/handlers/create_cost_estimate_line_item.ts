import { db } from '../db';
import { costEstimateLineItemsTable, costEstimatesTable } from '../db/schema';
import { type CreateCostEstimateLineItemInput, type CostEstimateLineItem } from '../schema';
import { eq } from 'drizzle-orm';

export const createCostEstimateLineItem = async (input: CreateCostEstimateLineItemInput): Promise<CostEstimateLineItem> => {
  try {
    // First, verify that the cost estimate exists
    const costEstimate = await db.select()
      .from(costEstimatesTable)
      .where(eq(costEstimatesTable.id, input.cost_estimate_id))
      .execute();

    if (costEstimate.length === 0) {
      throw new Error(`Cost estimate with ID ${input.cost_estimate_id} not found`);
    }

    // Calculate total price
    const totalPrice = input.quantity * input.unit_price;

    // Insert the line item
    const result = await db.insert(costEstimateLineItemsTable)
      .values({
        cost_estimate_id: input.cost_estimate_id,
        description: input.description,
        quantity: input.quantity,
        unit_price: input.unit_price.toString(), // Convert number to string for numeric column
        total_price: totalPrice.toString() // Convert number to string for numeric column
      })
      .returning()
      .execute();

    const lineItem = result[0];

    // Update the parent cost estimate's total_cost by adding the line item's total_price
    const currentTotalCost = parseFloat(costEstimate[0].total_cost);
    const newTotalCost = currentTotalCost + totalPrice;

    await db.update(costEstimatesTable)
      .set({
        total_cost: newTotalCost.toString(),
        updated_at: new Date()
      })
      .where(eq(costEstimatesTable.id, input.cost_estimate_id))
      .execute();

    // Convert numeric fields back to numbers before returning
    return {
      ...lineItem,
      unit_price: parseFloat(lineItem.unit_price),
      total_price: parseFloat(lineItem.total_price)
    };
  } catch (error) {
    console.error('Cost estimate line item creation failed:', error);
    throw error;
  }
};