import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { purchaseOrdersTable, usersTable } from '../db/schema';
import { type IdInput, type CreateUserInput } from '../schema';
import { getPurchaseOrderById } from '../handlers/get_purchase_order_by_id';

// Test user data
const testUser: CreateUserInput = {
  username: 'testuser',
  email: 'test@example.com',
  full_name: 'Test User',
  role: 'UNIT_KERJA',
  is_active: true
};

describe('getPurchaseOrderById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return purchase order by ID', async () => {
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Create a test purchase order
    const poResult = await db.insert(purchaseOrdersTable)
      .values({
        po_number: 'PO-2024-001',
        title: 'Test Purchase Order',
        description: 'A test purchase order',
        requested_by: userId,
        status: 'DRAFT',
        total_amount: '1500.50'
      })
      .returning()
      .execute();

    const poId = poResult[0].id;
    const input: IdInput = { id: poId };

    const result = await getPurchaseOrderById(input);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(poId);
    expect(result!.po_number).toEqual('PO-2024-001');
    expect(result!.title).toEqual('Test Purchase Order');
    expect(result!.description).toEqual('A test purchase order');
    expect(result!.requested_by).toEqual(userId);
    expect(result!.status).toEqual('DRAFT');
    expect(result!.total_amount).toEqual(1500.50);
    expect(typeof result!.total_amount).toEqual('number');
    expect(result!.approved_by).toBeNull();
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null for non-existent purchase order', async () => {
    const input: IdInput = { id: 999999 };

    const result = await getPurchaseOrderById(input);

    expect(result).toBeNull();
  });

  it('should handle purchase orders with approved_by set', async () => {
    // Create test users
    const requestedByResult = await db.insert(usersTable)
      .values({
        ...testUser,
        username: 'requester',
        email: 'requester@example.com'
      })
      .returning()
      .execute();

    const approvedByResult = await db.insert(usersTable)
      .values({
        ...testUser,
        username: 'approver',
        email: 'approver@example.com',
        role: 'ADMIN'
      })
      .returning()
      .execute();

    const requesterId = requestedByResult[0].id;
    const approverId = approvedByResult[0].id;

    // Create approved purchase order
    const poResult = await db.insert(purchaseOrdersTable)
      .values({
        po_number: 'PO-2024-002',
        title: 'Approved Purchase Order',
        description: 'An approved purchase order',
        requested_by: requesterId,
        approved_by: approverId,
        status: 'APPROVED',
        total_amount: '2500.75'
      })
      .returning()
      .execute();

    const poId = poResult[0].id;
    const input: IdInput = { id: poId };

    const result = await getPurchaseOrderById(input);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(poId);
    expect(result!.po_number).toEqual('PO-2024-002');
    expect(result!.title).toEqual('Approved Purchase Order');
    expect(result!.requested_by).toEqual(requesterId);
    expect(result!.approved_by).toEqual(approverId);
    expect(result!.status).toEqual('APPROVED');
    expect(result!.total_amount).toEqual(2500.75);
    expect(typeof result!.total_amount).toEqual('number');
  });

  it('should handle purchase orders with null description', async () => {
    // Create a test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Create purchase order with null description
    const poResult = await db.insert(purchaseOrdersTable)
      .values({
        po_number: 'PO-2024-003',
        title: 'Purchase Order No Description',
        description: null,
        requested_by: userId,
        status: 'PENDING_APPROVAL',
        total_amount: '999.99'
      })
      .returning()
      .execute();

    const poId = poResult[0].id;
    const input: IdInput = { id: poId };

    const result = await getPurchaseOrderById(input);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(poId);
    expect(result!.description).toBeNull();
    expect(result!.status).toEqual('PENDING_APPROVAL');
    expect(result!.total_amount).toEqual(999.99);
  });

  it('should properly handle different purchase order statuses', async () => {
    // Create a test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Test different statuses
    const statuses = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PROGRESS', 'COMPLETED', 'REJECTED'] as const;

    for (let i = 0; i < statuses.length; i++) {
      const status = statuses[i];
      const poResult = await db.insert(purchaseOrdersTable)
        .values({
          po_number: `PO-2024-${String(i + 10).padStart(3, '0')}`,
          title: `Purchase Order ${status}`,
          description: `Purchase order with ${status} status`,
          requested_by: userId,
          status: status,
          total_amount: `${(i + 1) * 100}.00`
        })
        .returning()
        .execute();

      const poId = poResult[0].id;
      const input: IdInput = { id: poId };

      const result = await getPurchaseOrderById(input);

      expect(result).not.toBeNull();
      expect(result!.status).toEqual(status);
      expect(result!.total_amount).toEqual((i + 1) * 100);
    }
  });
});