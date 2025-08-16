import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { purchaseOrdersTable, usersTable } from '../db/schema';
import { type CreateUserInput, type CreatePurchaseOrderInput } from '../schema';
import { getPurchaseOrders } from '../handlers/get_purchase_orders';

// Test data
const testUser: CreateUserInput = {
  username: 'testuser',
  email: 'test@example.com',
  full_name: 'Test User',
  role: 'UNIT_KERJA',
  is_active: true
};

const testPurchaseOrder: CreatePurchaseOrderInput = {
  title: 'Test Purchase Order',
  description: 'A test purchase order',
  total_amount: 15000.50
};

describe('getPurchaseOrders', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no purchase orders exist', async () => {
    const result = await getPurchaseOrders();
    
    expect(result).toEqual([]);
  });

  it('should fetch purchase orders with correct data types', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        username: testUser.username,
        email: testUser.email,
        full_name: testUser.full_name,
        role: testUser.role,
        is_active: testUser.is_active
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create purchase order
    await db.insert(purchaseOrdersTable)
      .values({
        po_number: 'PO-001',
        title: testPurchaseOrder.title,
        description: testPurchaseOrder.description,
        requested_by: userId,
        total_amount: testPurchaseOrder.total_amount.toString() // Convert to string for database
      })
      .execute();

    const result = await getPurchaseOrders();

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Test Purchase Order');
    expect(result[0].description).toEqual('A test purchase order');
    expect(result[0].requested_by).toEqual(userId);
    expect(result[0].approved_by).toBeNull();
    expect(result[0].status).toEqual('DRAFT');
    expect(typeof result[0].total_amount).toBe('number');
    expect(result[0].total_amount).toEqual(15000.50);
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
    expect(result[0].po_number).toBeDefined();
  });

  it('should fetch multiple purchase orders', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        username: testUser.username,
        email: testUser.email,
        full_name: testUser.full_name,
        role: testUser.role,
        is_active: testUser.is_active
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create multiple purchase orders
    await db.insert(purchaseOrdersTable)
      .values([
        {
          po_number: 'PO-001',
          title: 'First Purchase Order',
          description: 'First test order',
          requested_by: userId,
          total_amount: '10000.00'
        },
        {
          po_number: 'PO-002',
          title: 'Second Purchase Order',
          description: 'Second test order',
          requested_by: userId,
          total_amount: '20000.50'
        }
      ])
      .execute();

    const result = await getPurchaseOrders();

    expect(result).toHaveLength(2);
    
    // Verify data types and content
    result.forEach(po => {
      expect(typeof po.total_amount).toBe('number');
      expect(po.created_at).toBeInstanceOf(Date);
      expect(po.updated_at).toBeInstanceOf(Date);
      expect(po.requested_by).toEqual(userId);
    });

    // Verify specific content
    const titles = result.map(po => po.title).sort();
    expect(titles).toEqual(['First Purchase Order', 'Second Purchase Order']);
  });

  it('should handle purchase orders with approved_by field', async () => {
    // Create two users (requester and approver)
    const requesterResult = await db.insert(usersTable)
      .values({
        username: 'requester',
        email: 'requester@example.com',
        full_name: 'Requester User',
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

    const requesterId = requesterResult[0].id;
    const approverId = approverResult[0].id;

    // Create purchase order with approver
    await db.insert(purchaseOrdersTable)
      .values({
        po_number: 'PO-001',
        title: 'Approved Purchase Order',
        description: 'An approved order',
        requested_by: requesterId,
        approved_by: approverId,
        status: 'APPROVED',
        total_amount: '25000.75'
      })
      .execute();

    const result = await getPurchaseOrders();

    expect(result).toHaveLength(1);
    expect(result[0].requested_by).toEqual(requesterId);
    expect(result[0].approved_by).toEqual(approverId);
    expect(result[0].status).toEqual('APPROVED');
    expect(result[0].total_amount).toEqual(25000.75);
  });

  it('should handle purchase orders with different statuses', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        username: testUser.username,
        email: testUser.email,
        full_name: testUser.full_name,
        role: testUser.role,
        is_active: testUser.is_active
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create purchase orders with different statuses
    await db.insert(purchaseOrdersTable)
      .values([
        {
          po_number: 'PO-001',
          title: 'Draft Order',
          requested_by: userId,
          status: 'DRAFT',
          total_amount: '1000.00'
        },
        {
          po_number: 'PO-002',
          title: 'Pending Order',
          requested_by: userId,
          status: 'PENDING_APPROVAL',
          total_amount: '2000.00'
        },
        {
          po_number: 'PO-003',
          title: 'Completed Order',
          requested_by: userId,
          status: 'COMPLETED',
          total_amount: '3000.00'
        }
      ])
      .execute();

    const result = await getPurchaseOrders();

    expect(result).toHaveLength(3);
    
    const statuses = result.map(po => po.status).sort();
    expect(statuses).toEqual(['COMPLETED', 'DRAFT', 'PENDING_APPROVAL']);

    // Verify all orders are fetched regardless of status
    const titles = result.map(po => po.title).sort();
    expect(titles).toEqual(['Completed Order', 'Draft Order', 'Pending Order']);
  });

  it('should handle null description fields', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        username: testUser.username,
        email: testUser.email,
        full_name: testUser.full_name,
        role: testUser.role,
        is_active: testUser.is_active
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create purchase order with null description
    await db.insert(purchaseOrdersTable)
      .values({
        po_number: 'PO-001',
        title: 'Order without description',
        description: null,
        requested_by: userId,
        total_amount: '5000.00'
      })
      .execute();

    const result = await getPurchaseOrders();

    expect(result).toHaveLength(1);
    expect(result[0].description).toBeNull();
    expect(result[0].title).toEqual('Order without description');
  });
});