import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, purchaseOrdersTable } from '../db/schema';
import { type IdInput } from '../schema';
import { deletePurchaseOrder } from '../handlers/delete_purchase_order';
import { eq } from 'drizzle-orm';

describe('deletePurchaseOrder', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a purchase order with DRAFT status', async () => {
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'UNIT_KERJA',
        is_active: true
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create a test purchase order with DRAFT status
    const poResult = await db.insert(purchaseOrdersTable)
      .values({
        po_number: 'PO-2024-001',
        title: 'Test Purchase Order',
        description: 'A test purchase order',
        requested_by: userId,
        status: 'DRAFT',
        total_amount: '1000.00'
      })
      .returning()
      .execute();

    const purchaseOrderId = poResult[0].id;

    const testInput: IdInput = {
      id: purchaseOrderId
    };

    // Delete the purchase order
    const result = await deletePurchaseOrder(testInput);

    // Verify deletion was successful
    expect(result.success).toBe(true);

    // Verify the purchase order no longer exists in database
    const deletedPO = await db.select()
      .from(purchaseOrdersTable)
      .where(eq(purchaseOrdersTable.id, purchaseOrderId))
      .execute();

    expect(deletedPO).toHaveLength(0);
  });

  it('should throw error when purchase order does not exist', async () => {
    const testInput: IdInput = {
      id: 99999 // Non-existent ID
    };

    await expect(deletePurchaseOrder(testInput)).rejects.toThrow(/purchase order not found/i);
  });

  it('should throw error when trying to delete purchase order with PENDING_APPROVAL status', async () => {
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'UNIT_KERJA',
        is_active: true
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create a test purchase order with PENDING_APPROVAL status
    const poResult = await db.insert(purchaseOrdersTable)
      .values({
        po_number: 'PO-2024-002',
        title: 'Test Purchase Order',
        description: 'A test purchase order',
        requested_by: userId,
        status: 'PENDING_APPROVAL',
        total_amount: '1500.00'
      })
      .returning()
      .execute();

    const purchaseOrderId = poResult[0].id;

    const testInput: IdInput = {
      id: purchaseOrderId
    };

    // Try to delete the purchase order
    await expect(deletePurchaseOrder(testInput)).rejects.toThrow(/only purchase orders with draft status can be deleted/i);

    // Verify the purchase order still exists in database
    const existingPO = await db.select()
      .from(purchaseOrdersTable)
      .where(eq(purchaseOrdersTable.id, purchaseOrderId))
      .execute();

    expect(existingPO).toHaveLength(1);
    expect(existingPO[0].status).toBe('PENDING_APPROVAL');
  });

  it('should throw error when trying to delete purchase order with APPROVED status', async () => {
    // Create test users
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'UNIT_KERJA',
        is_active: true
      })
      .returning()
      .execute();

    const approverResult = await db.insert(usersTable)
      .values({
        username: 'approver',
        email: 'approver@example.com',
        full_name: 'Approver User',
        role: 'BSP',
        is_active: true
      })
      .returning()
      .execute();

    const userId = userResult[0].id;
    const approverId = approverResult[0].id;

    // Create a test purchase order with APPROVED status
    const poResult = await db.insert(purchaseOrdersTable)
      .values({
        po_number: 'PO-2024-003',
        title: 'Test Purchase Order',
        description: 'A test purchase order',
        requested_by: userId,
        approved_by: approverId,
        status: 'APPROVED',
        total_amount: '2000.00'
      })
      .returning()
      .execute();

    const purchaseOrderId = poResult[0].id;

    const testInput: IdInput = {
      id: purchaseOrderId
    };

    // Try to delete the purchase order
    await expect(deletePurchaseOrder(testInput)).rejects.toThrow(/only purchase orders with draft status can be deleted/i);

    // Verify the purchase order still exists in database
    const existingPO = await db.select()
      .from(purchaseOrdersTable)
      .where(eq(purchaseOrdersTable.id, purchaseOrderId))
      .execute();

    expect(existingPO).toHaveLength(1);
    expect(existingPO[0].status).toBe('APPROVED');
  });

  it('should throw error when trying to delete purchase order with COMPLETED status', async () => {
    // Create test users
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'UNIT_KERJA',
        is_active: true
      })
      .returning()
      .execute();

    const approverResult = await db.insert(usersTable)
      .values({
        username: 'approver',
        email: 'approver@example.com',
        full_name: 'Approver User',
        role: 'BSP',
        is_active: true
      })
      .returning()
      .execute();

    const userId = userResult[0].id;
    const approverId = approverResult[0].id;

    // Create a test purchase order with COMPLETED status
    const poResult = await db.insert(purchaseOrdersTable)
      .values({
        po_number: 'PO-2024-004',
        title: 'Test Purchase Order',
        description: 'A test purchase order',
        requested_by: userId,
        approved_by: approverId,
        status: 'COMPLETED',
        total_amount: '2500.00'
      })
      .returning()
      .execute();

    const purchaseOrderId = poResult[0].id;

    const testInput: IdInput = {
      id: purchaseOrderId
    };

    // Try to delete the purchase order
    await expect(deletePurchaseOrder(testInput)).rejects.toThrow(/only purchase orders with draft status can be deleted/i);

    // Verify the purchase order still exists in database
    const existingPO = await db.select()
      .from(purchaseOrdersTable)
      .where(eq(purchaseOrdersTable.id, purchaseOrderId))
      .execute();

    expect(existingPO).toHaveLength(1);
    expect(existingPO[0].status).toBe('COMPLETED');
  });

  it('should delete multiple purchase orders with DRAFT status', async () => {
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'UNIT_KERJA',
        is_active: true
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create multiple test purchase orders with DRAFT status
    const poResult1 = await db.insert(purchaseOrdersTable)
      .values({
        po_number: 'PO-2024-005',
        title: 'Test Purchase Order 1',
        description: 'First test purchase order',
        requested_by: userId,
        status: 'DRAFT',
        total_amount: '1000.00'
      })
      .returning()
      .execute();

    const poResult2 = await db.insert(purchaseOrdersTable)
      .values({
        po_number: 'PO-2024-006',
        title: 'Test Purchase Order 2',
        description: 'Second test purchase order',
        requested_by: userId,
        status: 'DRAFT',
        total_amount: '1500.00'
      })
      .returning()
      .execute();

    const purchaseOrderId1 = poResult1[0].id;
    const purchaseOrderId2 = poResult2[0].id;

    // Delete first purchase order
    const result1 = await deletePurchaseOrder({ id: purchaseOrderId1 });
    expect(result1.success).toBe(true);

    // Delete second purchase order
    const result2 = await deletePurchaseOrder({ id: purchaseOrderId2 });
    expect(result2.success).toBe(true);

    // Verify both purchase orders no longer exist in database
    const deletedPOs = await db.select()
      .from(purchaseOrdersTable)
      .where(eq(purchaseOrdersTable.requested_by, userId))
      .execute();

    expect(deletedPOs).toHaveLength(0);
  });
});