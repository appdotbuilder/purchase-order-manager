import { db } from '../db';
import { costEstimateLineItemsTable, costEstimatesTable, usersTable } from '../db/schema';
import { type IdInput } from '../schema';
import { eq, sum } from 'drizzle-orm';

export async function deleteCostEstimateLineItem(input: IdInput): Promise<{ success: boolean }> {
  try {
    // First, get the line item to verify it exists and get the cost estimate ID
    const lineItem = await db.select()
      .from(costEstimateLineItemsTable)
      .where(eq(costEstimateLineItemsTable.id, input.id))
      .execute();

    if (lineItem.length === 0) {
      throw new Error('Cost estimate line item not found');
    }

    const costEstimateId = lineItem[0].cost_estimate_id;

    // Get the cost estimate and verify it's in DRAFT status
    const costEstimate = await db.select({
      id: costEstimatesTable.id,
      status: costEstimatesTable.status,
      created_by: costEstimatesTable.created_by
    })
      .from(costEstimatesTable)
      .where(eq(costEstimatesTable.id, costEstimateId))
      .execute();

    if (costEstimate.length === 0) {
      throw new Error('Cost estimate not found');
    }

    if (costEstimate[0].status !== 'DRAFT') {
      throw new Error('Cannot delete line items from cost estimates that are not in DRAFT status');
    }

    // Get the user who created the cost estimate and verify they have BSP role
    const user = await db.select({
      role: usersTable.role
    })
      .from(usersTable)
      .where(eq(usersTable.id, costEstimate[0].created_by))
      .execute();

    if (user.length === 0) {
      throw new Error('User not found');
    }

    if (user[0].role !== 'BSP') {
      throw new Error('Only BSP role can delete cost estimate line items');
    }

    // Delete the line item
    await db.delete(costEstimateLineItemsTable)
      .where(eq(costEstimateLineItemsTable.id, input.id))
      .execute();

    // Recalculate and update the parent cost estimate's total_cost
    const remainingLineItems = await db.select({
      totalCost: sum(costEstimateLineItemsTable.total_price)
    })
      .from(costEstimateLineItemsTable)
      .where(eq(costEstimateLineItemsTable.cost_estimate_id, costEstimateId))
      .execute();

    // Handle case where no line items remain (sum returns null)
    const newTotalCost = remainingLineItems[0].totalCost || '0';

    await db.update(costEstimatesTable)
      .set({
        total_cost: newTotalCost,
        updated_at: new Date()
      })
      .where(eq(costEstimatesTable.id, costEstimateId))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Cost estimate line item deletion failed:', error);
    throw error;
  }
}