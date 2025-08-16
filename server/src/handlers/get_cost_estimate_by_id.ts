import { db } from '../db';
import { costEstimatesTable } from '../db/schema';
import { type IdInput, type CostEstimate } from '../schema';
import { eq } from 'drizzle-orm';

export async function getCostEstimateById(input: IdInput): Promise<CostEstimate | null> {
  try {
    // Query the cost estimate by ID
    const results = await db.select()
      .from(costEstimatesTable)
      .where(eq(costEstimatesTable.id, input.id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const costEstimate = results[0];

    // Convert numeric fields back to numbers before returning
    return {
      ...costEstimate,
      total_cost: parseFloat(costEstimate.total_cost)
    };
  } catch (error) {
    console.error('Cost estimate retrieval failed:', error);
    throw error;
  }
}