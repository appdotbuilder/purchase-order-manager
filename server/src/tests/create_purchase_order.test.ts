import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { purchaseOrdersTable, usersTable } from '../db/schema';
import { type CreatePurchaseOrderInput } from '../schema';
import { createPurchaseOrder } from '../handlers/create_purchase_order';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreatePurchaseOrderInput = {
  title: 'Test Purchase Order',
  description: 'A purchase order for testing',
  total_amount: 1500.75
};

// Test input with null description
const testInputNullDescription: CreatePurchaseOrderInput = {
  title: 'Test PO No Description',
  description: null,
  total_amount: 999.99
};

describe('createPurchaseOrder', () => {
  beforeEach(async () => {
    await createDB();
    
    // Create a test user first (required for foreign key)
    await db.insert(usersTable).values({
      username: 'testuser',
      email: 'test@example.com',
      full_name: 'Test User',
      role: 'UNIT_KERJA',
      is_active: true
    }).execute();
  });
  
  afterEach(resetDB);

  it('should create a purchase order with valid input', async () => {
    const result = await createPurchaseOrder(testInput);

    // Basic field validation
    expect(result.title).toEqual('Test Purchase Order');
    expect(result.description).toEqual('A purchase order for testing');
    expect(result.total_amount).toEqual(1500.75);
    expect(typeof result.total_amount).toBe('number');
    expect(result.requested_by).toEqual(1);
    expect(result.approved_by).toBeNull();
    expect(result.status).toEqual('DRAFT');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should generate unique PO number', async () => {
    const result = await createPurchaseOrder(testInput);
    
    expect(result.po_number).toMatch(/^PO-\d+$/);
    expect(result.po_number.length).toBeGreaterThan(3);
  });

  it('should handle null description correctly', async () => {
    const result = await createPurchaseOrder(testInputNullDescription);

    expect(result.title).toEqual('Test PO No Description');
    expect(result.description).toBeNull();
    expect(result.total_amount).toEqual(999.99);
    expect(result.status).toEqual('DRAFT');
  });

  it('should save purchase order to database', async () => {
    const result = await createPurchaseOrder(testInput);

    // Query using proper drizzle syntax
    const purchaseOrders = await db.select()
      .from(purchaseOrdersTable)
      .where(eq(purchaseOrdersTable.id, result.id))
      .execute();

    expect(purchaseOrders).toHaveLength(1);
    
    const savedPO = purchaseOrders[0];
    expect(savedPO.title).toEqual('Test Purchase Order');
    expect(savedPO.description).toEqual('A purchase order for testing');
    expect(parseFloat(savedPO.total_amount)).toEqual(1500.75);
    expect(savedPO.requested_by).toEqual(1);
    expect(savedPO.approved_by).toBeNull();
    expect(savedPO.status).toEqual('DRAFT');
    expect(savedPO.created_at).toBeInstanceOf(Date);
    expect(savedPO.updated_at).toBeInstanceOf(Date);
    expect(savedPO.po_number).toMatch(/^PO-\d+$/);
  });

  it('should create multiple purchase orders with unique PO numbers', async () => {
    const result1 = await createPurchaseOrder(testInput);
    
    // Wait a millisecond to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 1));
    
    const result2 = await createPurchaseOrder(testInputNullDescription);

    expect(result1.po_number).not.toEqual(result2.po_number);
    expect(result1.po_number).toMatch(/^PO-\d+$/);
    expect(result2.po_number).toMatch(/^PO-\d+$/);
    
    // Verify both are saved in database
    const allPOs = await db.select()
      .from(purchaseOrdersTable)
      .execute();
    
    expect(allPOs).toHaveLength(2);
  });

  it('should handle numeric precision correctly', async () => {
    const precisionInput: CreatePurchaseOrderInput = {
      title: 'Precision Test',
      description: 'Testing decimal precision',
      total_amount: 12345.67
    };

    const result = await createPurchaseOrder(precisionInput);
    
    expect(result.total_amount).toEqual(12345.67);
    expect(typeof result.total_amount).toBe('number');

    // Verify in database
    const saved = await db.select()
      .from(purchaseOrdersTable)
      .where(eq(purchaseOrdersTable.id, result.id))
      .execute();

    expect(parseFloat(saved[0].total_amount)).toEqual(12345.67);
  });
});