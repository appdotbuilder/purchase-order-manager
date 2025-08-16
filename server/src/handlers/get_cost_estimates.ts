import { db } from '../db';
import { costEstimatesTable, purchaseOrdersTable, usersTable } from '../db/schema';
import { type CostEstimate } from '../schema';
import { eq } from 'drizzle-orm';

export const getCostEstimates = async (): Promise<CostEstimate[]> => {
  try {
    // Query cost estimates with related purchase order and user information
    const results = await db.select({
      cost_estimate: costEstimatesTable,
      purchase_order: purchaseOrdersTable,
      created_by_user: {
        id: usersTable.id,
        username: usersTable.username,
        full_name: usersTable.full_name,
        role: usersTable.role
      }
    })
    .from(costEstimatesTable)
    .innerJoin(purchaseOrdersTable, eq(costEstimatesTable.purchase_order_id, purchaseOrdersTable.id))
    .innerJoin(usersTable, eq(costEstimatesTable.created_by, usersTable.id))
    .execute();

    // Transform the results to match the CostEstimate schema
    return results.map(result => ({
      id: result.cost_estimate.id,
      purchase_order_id: result.cost_estimate.purchase_order_id,
      title: result.cost_estimate.title,
      description: result.cost_estimate.description,
      created_by: result.cost_estimate.created_by,
      approved_by: result.cost_estimate.approved_by,
      status: result.cost_estimate.status,
      total_cost: parseFloat(result.cost_estimate.total_cost), // Convert numeric to number
      created_at: result.cost_estimate.created_at,
      updated_at: result.cost_estimate.updated_at
    }));
  } catch (error) {
    console.error('Failed to fetch cost estimates:', error);
    throw error;
  }
};