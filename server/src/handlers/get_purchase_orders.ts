import { db } from '../db';
import { purchaseOrdersTable, usersTable } from '../db/schema';
import { type PurchaseOrder } from '../schema';
import { eq } from 'drizzle-orm';

export async function getPurchaseOrders(): Promise<PurchaseOrder[]> {
  try {
    // Fetch purchase orders with related user information
    const results = await db.select()
      .from(purchaseOrdersTable)
      .leftJoin(usersTable, eq(purchaseOrdersTable.requested_by, usersTable.id))
      .execute();

    // Transform results and convert numeric fields
    return results.map(result => ({
      id: result.purchase_orders.id,
      po_number: result.purchase_orders.po_number,
      title: result.purchase_orders.title,
      description: result.purchase_orders.description,
      requested_by: result.purchase_orders.requested_by,
      approved_by: result.purchase_orders.approved_by,
      status: result.purchase_orders.status,
      total_amount: parseFloat(result.purchase_orders.total_amount), // Convert numeric to number
      created_at: result.purchase_orders.created_at,
      updated_at: result.purchase_orders.updated_at
    }));
  } catch (error) {
    console.error('Failed to fetch purchase orders:', error);
    throw error;
  }
}