import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, purchaseOrdersTable, costEstimatesTable, costEstimateLineItemsTable } from '../db/schema';
import { type IdInput } from '../schema';
import { deleteCostEstimate } from '../handlers/delete_cost_estimate';
import { eq } from 'drizzle-orm';

describe('deleteCostEstimate', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  const testInput: IdInput = {
    id: 1
  };

  it('should delete a draft cost estimate and its line items', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'BSP',
        is_active: true
      })
      .returning()
      .execute();

    const purchaseOrder = await db.insert(purchaseOrdersTable)
      .values({
        po_number: 'PO-001',
        title: 'Test PO',
        description: 'Test purchase order',
        requested_by: user[0].id,
        status: 'DRAFT',
        total_amount: '1000.00'
      })
      .returning()
      .execute();

    const costEstimate = await db.insert(costEstimatesTable)
      .values({
        purchase_order_id: purchaseOrder[0].id,
        title: 'Test Cost Estimate',
        description: 'Test description',
        created_by: user[0].id,
        status: 'DRAFT',
        total_cost: '500.00'
      })
      .returning()
      .execute();

    // Create line items
    await db.insert(costEstimateLineItemsTable)
      .values([
        {
          cost_estimate_id: costEstimate[0].id,
          description: 'Item 1',
          quantity: 2,
          unit_price: '100.00',
          total_price: '200.00'
        },
        {
          cost_estimate_id: costEstimate[0].id,
          description: 'Item 2',
          quantity: 3,
          unit_price: '100.00',
          total_price: '300.00'
        }
      ])
      .execute();

    // Verify data exists before deletion
    const lineItemsBefore = await db.select()
      .from(costEstimateLineItemsTable)
      .where(eq(costEstimateLineItemsTable.cost_estimate_id, costEstimate[0].id))
      .execute();

    expect(lineItemsBefore).toHaveLength(2);

    // Delete the cost estimate
    const result = await deleteCostEstimate({ id: costEstimate[0].id });

    expect(result.success).toBe(true);

    // Verify cost estimate is deleted
    const costEstimatesAfter = await db.select()
      .from(costEstimatesTable)
      .where(eq(costEstimatesTable.id, costEstimate[0].id))
      .execute();

    expect(costEstimatesAfter).toHaveLength(0);

    // Verify line items are deleted
    const lineItemsAfter = await db.select()
      .from(costEstimateLineItemsTable)
      .where(eq(costEstimateLineItemsTable.cost_estimate_id, costEstimate[0].id))
      .execute();

    expect(lineItemsAfter).toHaveLength(0);
  });

  it('should throw error when cost estimate does not exist', async () => {
    await expect(deleteCostEstimate({ id: 999 }))
      .rejects
      .toThrow(/cost estimate not found/i);
  });

  it('should throw error when trying to delete non-draft cost estimate', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'BSP',
        is_active: true
      })
      .returning()
      .execute();

    const purchaseOrder = await db.insert(purchaseOrdersTable)
      .values({
        po_number: 'PO-001',
        title: 'Test PO',
        description: 'Test purchase order',
        requested_by: user[0].id,
        status: 'DRAFT',
        total_amount: '1000.00'
      })
      .returning()
      .execute();

    const costEstimate = await db.insert(costEstimatesTable)
      .values({
        purchase_order_id: purchaseOrder[0].id,
        title: 'Test Cost Estimate',
        description: 'Test description',
        created_by: user[0].id,
        status: 'APPROVED', // Non-draft status
        total_cost: '500.00'
      })
      .returning()
      .execute();

    await expect(deleteCostEstimate({ id: costEstimate[0].id }))
      .rejects
      .toThrow(/only draft cost estimates can be deleted/i);
  });

  it('should handle deletion when cost estimate has no line items', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'BSP',
        is_active: true
      })
      .returning()
      .execute();

    const purchaseOrder = await db.insert(purchaseOrdersTable)
      .values({
        po_number: 'PO-001',
        title: 'Test PO',
        description: 'Test purchase order',
        requested_by: user[0].id,
        status: 'DRAFT',
        total_amount: '1000.00'
      })
      .returning()
      .execute();

    const costEstimate = await db.insert(costEstimatesTable)
      .values({
        purchase_order_id: purchaseOrder[0].id,
        title: 'Test Cost Estimate',
        description: 'Test description',
        created_by: user[0].id,
        status: 'DRAFT',
        total_cost: '500.00'
      })
      .returning()
      .execute();

    // Delete the cost estimate (no line items exist)
    const result = await deleteCostEstimate({ id: costEstimate[0].id });

    expect(result.success).toBe(true);

    // Verify cost estimate is deleted
    const costEstimatesAfter = await db.select()
      .from(costEstimatesTable)
      .where(eq(costEstimatesTable.id, costEstimate[0].id))
      .execute();

    expect(costEstimatesAfter).toHaveLength(0);
  });

  it('should verify status validation for different statuses', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'BSP',
        is_active: true
      })
      .returning()
      .execute();

    const purchaseOrder = await db.insert(purchaseOrdersTable)
      .values({
        po_number: 'PO-001',
        title: 'Test PO',
        description: 'Test purchase order',
        requested_by: user[0].id,
        status: 'DRAFT',
        total_amount: '1000.00'
      })
      .returning()
      .execute();

    // Test different non-draft statuses
    const nonDraftStatuses = ['PENDING_APPROVAL', 'APPROVED', 'REJECTED'];
    
    for (const status of nonDraftStatuses) {
      const costEstimate = await db.insert(costEstimatesTable)
        .values({
          purchase_order_id: purchaseOrder[0].id,
          title: `Test Cost Estimate ${status}`,
          description: 'Test description',
          created_by: user[0].id,
          status: status as any,
          total_cost: '500.00'
        })
        .returning()
        .execute();

      await expect(deleteCostEstimate({ id: costEstimate[0].id }))
        .rejects
        .toThrow(/only draft cost estimates can be deleted/i);
    }
  });
});