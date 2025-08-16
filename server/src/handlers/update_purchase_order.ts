import { db } from '../db';
import { purchaseOrdersTable } from '../db/schema';
import { type UpdatePurchaseOrderInput, type PurchaseOrder } from '../schema';
import { eq } from 'drizzle-orm';

export const updatePurchaseOrder = async (input: UpdatePurchaseOrderInput): Promise<PurchaseOrder> => {
  try {
    // First, verify the purchase order exists
    const existingPO = await db.select()
      .from(purchaseOrdersTable)
      .where(eq(purchaseOrdersTable.id, input.id))
      .execute();

    if (existingPO.length === 0) {
      throw new Error(`Purchase order with ID ${input.id} not found`);
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

    if (input.total_amount !== undefined) {
      updateData.total_amount = input.total_amount.toString(); // Convert number to string for numeric column
    }

    if (input.status !== undefined) {
      updateData.status = input.status;
    }

    // Update the purchase order
    const result = await db.update(purchaseOrdersTable)
      .set(updateData)
      .where(eq(purchaseOrdersTable.id, input.id))
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const updatedPO = result[0];
    return {
      ...updatedPO,
      total_amount: parseFloat(updatedPO.total_amount) // Convert string back to number
    };
  } catch (error) {
    console.error('Purchase order update failed:', error);
    throw error;
  }
};