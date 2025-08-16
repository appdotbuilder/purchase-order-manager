import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { purchaseOrdersTable, usersTable } from '../db/schema';
import { type ApprovePurchaseOrderInput } from '../schema';
import { approvePurchaseOrder } from '../handlers/approve_purchase_order';
import { eq } from 'drizzle-orm';

describe('approvePurchaseOrder', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testPurchaseOrderId: number;

  beforeEach(async () => {
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

    testUserId = userResult[0].id;

    // Create a test purchase order in PENDING_APPROVAL status
    const poResult = await db.insert(purchaseOrdersTable)
      .values({
        po_number: 'PO-TEST-001',
        title: 'Test Purchase Order',
        description: 'A test purchase order for approval testing',
        requested_by: testUserId,
        status: 'PENDING_APPROVAL',
        total_amount: '1500.50'
      })
      .returning()
      .execute();

    testPurchaseOrderId = poResult[0].id;
  });

  it('should approve a purchase order', async () => {
    const input: ApprovePurchaseOrderInput = {
      id: testPurchaseOrderId,
      approved: true
    };

    const result = await approvePurchaseOrder(input);

    // Verify the returned purchase order
    expect(result.id).toEqual(testPurchaseOrderId);
    expect(result.status).toEqual('APPROVED');
    expect(result.approved_by).toEqual(999); // Placeholder value
    expect(result.total_amount).toEqual(1500.50);
    expect(typeof result.total_amount).toEqual('number');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should reject a purchase order', async () => {
    const input: ApprovePurchaseOrderInput = {
      id: testPurchaseOrderId,
      approved: false
    };

    const result = await approvePurchaseOrder(input);

    // Verify the returned purchase order
    expect(result.id).toEqual(testPurchaseOrderId);
    expect(result.status).toEqual('REJECTED');
    expect(result.approved_by).toEqual(999); // Placeholder value
    expect(result.total_amount).toEqual(1500.50);
    expect(typeof result.total_amount).toEqual('number');
  });

  it('should save approval status to database', async () => {
    const input: ApprovePurchaseOrderInput = {
      id: testPurchaseOrderId,
      approved: true
    };

    await approvePurchaseOrder(input);

    // Verify the database was updated
    const savedPO = await db.select()
      .from(purchaseOrdersTable)
      .where(eq(purchaseOrdersTable.id, testPurchaseOrderId))
      .execute();

    expect(savedPO).toHaveLength(1);
    expect(savedPO[0].status).toEqual('APPROVED');
    expect(savedPO[0].approved_by).toEqual(999);
    expect(parseFloat(savedPO[0].total_amount)).toEqual(1500.50);
    expect(savedPO[0].updated_at).toBeInstanceOf(Date);
  });

  it('should save rejection status to database', async () => {
    const input: ApprovePurchaseOrderInput = {
      id: testPurchaseOrderId,
      approved: false
    };

    await approvePurchaseOrder(input);

    // Verify the database was updated
    const savedPO = await db.select()
      .from(purchaseOrdersTable)
      .where(eq(purchaseOrdersTable.id, testPurchaseOrderId))
      .execute();

    expect(savedPO).toHaveLength(1);
    expect(savedPO[0].status).toEqual('REJECTED');
    expect(savedPO[0].approved_by).toEqual(999);
  });

  it('should throw error when purchase order does not exist', async () => {
    const input: ApprovePurchaseOrderInput = {
      id: 99999,
      approved: true
    };

    await expect(approvePurchaseOrder(input)).rejects.toThrow(/not found/i);
  });

  it('should throw error when purchase order is not pending approval', async () => {
    // Create a purchase order with DRAFT status
    const draftPOResult = await db.insert(purchaseOrdersTable)
      .values({
        po_number: 'PO-DRAFT-001',
        title: 'Draft Purchase Order',
        description: 'A draft purchase order',
        requested_by: testUserId,
        status: 'DRAFT',
        total_amount: '500.00'
      })
      .returning()
      .execute();

    const input: ApprovePurchaseOrderInput = {
      id: draftPOResult[0].id,
      approved: true
    };

    await expect(approvePurchaseOrder(input)).rejects.toThrow(/not pending approval/i);
  });

  it('should handle purchase order with approved status correctly', async () => {
    // Create a purchase order that is already approved
    const approvedPOResult = await db.insert(purchaseOrdersTable)
      .values({
        po_number: 'PO-APPROVED-001',
        title: 'Already Approved Purchase Order',
        description: 'A purchase order that is already approved',
        requested_by: testUserId,
        approved_by: testUserId,
        status: 'APPROVED',
        total_amount: '750.00'
      })
      .returning()
      .execute();

    const input: ApprovePurchaseOrderInput = {
      id: approvedPOResult[0].id,
      approved: false
    };

    await expect(approvePurchaseOrder(input)).rejects.toThrow(/not pending approval.*APPROVED/i);
  });

  it('should preserve other purchase order fields during approval', async () => {
    const input: ApprovePurchaseOrderInput = {
      id: testPurchaseOrderId,
      approved: true
    };

    const result = await approvePurchaseOrder(input);

    // Verify all original fields are preserved
    expect(result.po_number).toEqual('PO-TEST-001');
    expect(result.title).toEqual('Test Purchase Order');
    expect(result.description).toEqual('A test purchase order for approval testing');
    expect(result.requested_by).toEqual(testUserId);
    expect(result.created_at).toBeInstanceOf(Date);
  });
});