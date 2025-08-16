import { db } from '../db';
import { purchaseOrdersTable } from '../db/schema';
import { type IdInput } from '../schema';
import { eq } from 'drizzle-orm';

export const deletePurchaseOrder = async (input: IdInput): Promise<{ success: boolean }> => {
  try {
    // First check if the purchase order exists
    const existingPOs = await db.select()
      .from(purchaseOrdersTable)
      .where(eq(purchaseOrdersTable.id, input.id))
      .execute();

    if (existingPOs.length === 0) {
      throw new Error('Purchase order not found');
    }

    const purchaseOrder = existingPOs[0];

    // Check if the purchase order can be deleted (only DRAFT status can be deleted)
    if (purchaseOrder.status !== 'DRAFT') {
      throw new Error('Only purchase orders with DRAFT status can be deleted');
    }

    // Delete the purchase order
    const result = await db.delete(purchaseOrdersTable)
      .where(eq(purchaseOrdersTable.id, input.id))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Purchase order deletion failed:', error);
    throw error;
  }
};