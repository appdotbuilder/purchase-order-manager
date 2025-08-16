import { db } from '../db';
import { costEstimateLineItemsTable } from '../db/schema';
import { type IdInput, type CostEstimateLineItem } from '../schema';
import { eq } from 'drizzle-orm';

export async function getCostEstimateLineItems(input: IdInput): Promise<CostEstimateLineItem[]> {
  try {
    // Query line items by cost_estimate_id
    const results = await db.select()
      .from(costEstimateLineItemsTable)
      .where(eq(costEstimateLineItemsTable.cost_estimate_id, input.id))
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(item => ({
      ...item,
      unit_price: parseFloat(item.unit_price),
      total_price: parseFloat(item.total_price)
    }));
  } catch (error) {
    console.error('Failed to fetch cost estimate line items:', error);
    throw error;
  }
}