import { db } from '../db';
import { purchaseOrdersTable } from '../db/schema';
import { type CreatePurchaseOrderInput, type PurchaseOrder } from '../schema';

export const createPurchaseOrder = async (input: CreatePurchaseOrderInput): Promise<PurchaseOrder> => {
  try {
    // Generate a unique PO number using timestamp
    const poNumber = `PO-${Date.now()}`;
    
    // For now, we'll use a hardcoded user ID (1) as requested_by
    // In a real implementation, this would come from authentication context
    const requestedBy = 1;

    // Insert purchase order record
    const result = await db.insert(purchaseOrdersTable)
      .values({
        po_number: poNumber,
        title: input.title,
        description: input.description,
        requested_by: requestedBy,
        approved_by: null,
        status: 'DRAFT',
        total_amount: input.total_amount.toString(), // Convert number to string for numeric column
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const purchaseOrder = result[0];
    return {
      ...purchaseOrder,
      total_amount: parseFloat(purchaseOrder.total_amount), // Convert string back to number
    };
  } catch (error) {
    console.error('Purchase order creation failed:', error);
    throw error;
  }
};