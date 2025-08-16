import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { purchaseOrdersTable, usersTable } from '../db/schema';
import { type UpdatePurchaseOrderInput, type CreateUserInput } from '../schema';
import { updatePurchaseOrder } from '../handlers/update_purchase_order';
import { eq } from 'drizzle-orm';

describe('updatePurchaseOrder', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testPOId: number;

  // Create test user and purchase order before each test
  beforeEach(async () => {
    // Create test user first
    const userInput: CreateUserInput = {
      username: 'testuser',
      email: 'test@example.com',
      full_name: 'Test User',
      role: 'UNIT_KERJA',
      is_active: true
    };

    const userResult = await db.insert(usersTable)
      .values(userInput)
      .returning()
      .execute();

    testUserId = userResult[0].id;

    // Create test purchase order
    const poResult = await db.insert(purchaseOrdersTable)
      .values({
        po_number: 'PO-TEST-001',
        title: 'Original Test PO',
        description: 'Original description',
        requested_by: testUserId,
        approved_by: null,
        status: 'DRAFT',
        total_amount: '1000.00'
      })
      .returning()
      .execute();

    testPOId = poResult[0].id;
  });

  it('should update purchase order title', async () => {
    const input: UpdatePurchaseOrderInput = {
      id: testPOId,
      title: 'Updated Test PO'
    };

    const result = await updatePurchaseOrder(input);

    expect(result.id).toEqual(testPOId);
    expect(result.title).toEqual('Updated Test PO');
    expect(result.description).toEqual('Original description'); // Should remain unchanged
    expect(result.total_amount).toEqual(1000); // Should remain unchanged
    expect(result.status).toEqual('DRAFT'); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(typeof result.total_amount).toBe('number');
  });

  it('should update purchase order description', async () => {
    const input: UpdatePurchaseOrderInput = {
      id: testPOId,
      description: 'Updated description'
    };

    const result = await updatePurchaseOrder(input);

    expect(result.id).toEqual(testPOId);
    expect(result.description).toEqual('Updated description');
    expect(result.title).toEqual('Original Test PO'); // Should remain unchanged
  });

  it('should update purchase order total amount with proper numeric conversion', async () => {
    const input: UpdatePurchaseOrderInput = {
      id: testPOId,
      total_amount: 2500.75
    };

    const result = await updatePurchaseOrder(input);

    expect(result.id).toEqual(testPOId);
    expect(result.total_amount).toEqual(2500.75);
    expect(typeof result.total_amount).toBe('number');
  });

  it('should update purchase order status', async () => {
    const input: UpdatePurchaseOrderInput = {
      id: testPOId,
      status: 'PENDING_APPROVAL'
    };

    const result = await updatePurchaseOrder(input);

    expect(result.id).toEqual(testPOId);
    expect(result.status).toEqual('PENDING_APPROVAL');
  });

  it('should update multiple fields at once', async () => {
    const input: UpdatePurchaseOrderInput = {
      id: testPOId,
      title: 'Multi-Updated PO',
      description: 'Multi-updated description',
      total_amount: 3500.99,
      status: 'APPROVED'
    };

    const result = await updatePurchaseOrder(input);

    expect(result.id).toEqual(testPOId);
    expect(result.title).toEqual('Multi-Updated PO');
    expect(result.description).toEqual('Multi-updated description');
    expect(result.total_amount).toEqual(3500.99);
    expect(result.status).toEqual('APPROVED');
    expect(typeof result.total_amount).toBe('number');
  });

  it('should handle null description update', async () => {
    const input: UpdatePurchaseOrderInput = {
      id: testPOId,
      description: null
    };

    const result = await updatePurchaseOrder(input);

    expect(result.id).toEqual(testPOId);
    expect(result.description).toBeNull();
  });

  it('should save updated data to database', async () => {
    const input: UpdatePurchaseOrderInput = {
      id: testPOId,
      title: 'Database Test PO',
      total_amount: 999.99
    };

    await updatePurchaseOrder(input);

    // Verify data was saved to database
    const savedPO = await db.select()
      .from(purchaseOrdersTable)
      .where(eq(purchaseOrdersTable.id, testPOId))
      .execute();

    expect(savedPO).toHaveLength(1);
    expect(savedPO[0].title).toEqual('Database Test PO');
    expect(parseFloat(savedPO[0].total_amount)).toEqual(999.99);
    expect(savedPO[0].updated_at).toBeInstanceOf(Date);
  });

  it('should update the updated_at timestamp', async () => {
    // Get original updated_at
    const originalPO = await db.select()
      .from(purchaseOrdersTable)
      .where(eq(purchaseOrdersTable.id, testPOId))
      .execute();

    const originalUpdatedAt = originalPO[0].updated_at;

    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const input: UpdatePurchaseOrderInput = {
      id: testPOId,
      title: 'Timestamp Test'
    };

    const result = await updatePurchaseOrder(input);

    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should throw error for non-existent purchase order', async () => {
    const input: UpdatePurchaseOrderInput = {
      id: 99999,
      title: 'Non-existent PO'
    };

    await expect(updatePurchaseOrder(input)).rejects.toThrow(/not found/i);
  });

  it('should handle partial updates correctly', async () => {
    // Update only one field
    const input: UpdatePurchaseOrderInput = {
      id: testPOId,
      status: 'PROGRESS'
    };

    const result = await updatePurchaseOrder(input);

    expect(result.status).toEqual('PROGRESS');
    expect(result.title).toEqual('Original Test PO'); // Should remain unchanged
    expect(result.description).toEqual('Original description'); // Should remain unchanged
    expect(result.total_amount).toEqual(1000); // Should remain unchanged
  });

  it('should handle large decimal amounts correctly', async () => {
    const input: UpdatePurchaseOrderInput = {
      id: testPOId,
      total_amount: 123456789.12
    };

    const result = await updatePurchaseOrder(input);

    expect(result.total_amount).toEqual(123456789.12);
    expect(typeof result.total_amount).toBe('number');
  });
});