import { db } from '../db';
import { purchaseOrdersTable } from '../db/schema';
import { type ApprovePurchaseOrderInput, type PurchaseOrder } from '../schema';
import { eq } from 'drizzle-orm';

export const approvePurchaseOrder = async (input: ApprovePurchaseOrderInput): Promise<PurchaseOrder> => {
  try {
    // First, verify the purchase order exists and is in PENDING_APPROVAL status
    const existingPO = await db.select()
      .from(purchaseOrdersTable)
      .where(eq(purchaseOrdersTable.id, input.id))
      .execute();

    if (existingPO.length === 0) {
      throw new Error(`Purchase order with ID ${input.id} not found`);
    }

    const purchaseOrder = existingPO[0];

    if (purchaseOrder.status !== 'PENDING_APPROVAL') {
      throw new Error(`Purchase order with ID ${input.id} is not pending approval (current status: ${purchaseOrder.status})`);
    }

    // Update the purchase order status and approval fields
    const newStatus = input.approved ? 'APPROVED' : 'REJECTED';
    // Note: In a real implementation, approved_by should come from authentication context
    // For now, we'll use a placeholder value that can be easily identified in tests
    const approvedBy = 999; // Placeholder for current user ID

    const result = await db.update(purchaseOrdersTable)
      .set({
        status: newStatus,
        approved_by: approvedBy,
        updated_at: new Date()
      })
      .where(eq(purchaseOrdersTable.id, input.id))
      .returning()
      .execute();

    const updatedPO = result[0];

    // Convert numeric fields back to numbers before returning
    return {
      ...updatedPO,
      total_amount: parseFloat(updatedPO.total_amount)
    };
  } catch (error) {
    console.error('Purchase order approval failed:', error);
    throw error;
  }
};