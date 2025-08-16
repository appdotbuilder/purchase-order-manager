import { db } from '../db';
import { purchaseOrdersTable } from '../db/schema';
import { type IdInput, type PurchaseOrder } from '../schema';
import { eq } from 'drizzle-orm';

export async function getPurchaseOrderById(input: IdInput): Promise<PurchaseOrder | null> {
  try {
    // Query for the purchase order by ID
    const results = await db.select()
      .from(purchaseOrdersTable)
      .where(eq(purchaseOrdersTable.id, input.id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    // Convert numeric fields back to numbers before returning
    const purchaseOrder = results[0];
    return {
      ...purchaseOrder,
      total_amount: parseFloat(purchaseOrder.total_amount)
    };
  } catch (error) {
    console.error('Failed to fetch purchase order:', error);
    throw error;
  }
}