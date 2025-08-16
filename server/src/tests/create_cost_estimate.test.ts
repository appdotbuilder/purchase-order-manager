import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { costEstimatesTable, purchaseOrdersTable, usersTable } from '../db/schema';
import { type CreateCostEstimateInput } from '../schema';
import { createCostEstimate } from '../handlers/create_cost_estimate';
import { eq } from 'drizzle-orm';

describe('createCostEstimate', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let approvedPurchaseOrderId: number;
  let draftPurchaseOrderId: number;

  const setupTestData = async () => {
    // Create a test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'BSP',
        is_active: true
      })
      .returning()
      .execute();
    
    testUserId = userResult[0].id;

    // Create an approved purchase order
    const approvedPoResult = await db.insert(purchaseOrdersTable)
      .values({
        po_number: 'PO-APPROVED-001',
        title: 'Test Approved Purchase Order',
        description: 'An approved purchase order for testing',
        requested_by: testUserId,
        approved_by: testUserId,
        status: 'APPROVED',
        total_amount: '10000.00'
      })
      .returning()
      .execute();

    approvedPurchaseOrderId = approvedPoResult[0].id;

    // Create a draft purchase order (not approved)
    const draftPoResult = await db.insert(purchaseOrdersTable)
      .values({
        po_number: 'PO-DRAFT-001',
        title: 'Test Draft Purchase Order',
        description: 'A draft purchase order for testing',
        requested_by: testUserId,
        status: 'DRAFT',
        total_amount: '5000.00'
      })
      .returning()
      .execute();

    draftPurchaseOrderId = draftPoResult[0].id;
  };

  const testInput: CreateCostEstimateInput = {
    purchase_order_id: 1, // Will be overridden in tests
    title: 'Test Cost Estimate',
    description: 'A cost estimate for testing',
    total_cost: 8500.00
  };

  it('should create a cost estimate for an approved purchase order', async () => {
    await setupTestData();
    
    const input = {
      ...testInput,
      purchase_order_id: approvedPurchaseOrderId
    };

    const result = await createCostEstimate(input);

    // Basic field validation
    expect(result.purchase_order_id).toEqual(approvedPurchaseOrderId);
    expect(result.title).toEqual('Test Cost Estimate');
    expect(result.description).toEqual('A cost estimate for testing');
    expect(result.total_cost).toEqual(8500.00);
    expect(typeof result.total_cost).toBe('number');
    expect(result.status).toEqual('DRAFT');
    expect(result.created_by).toEqual(1); // TODO: Update when auth context is available
    expect(result.approved_by).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save cost estimate to database', async () => {
    await setupTestData();
    
    const input = {
      ...testInput,
      purchase_order_id: approvedPurchaseOrderId
    };

    const result = await createCostEstimate(input);

    // Query the database to verify the cost estimate was saved
    const costEstimates = await db.select()
      .from(costEstimatesTable)
      .where(eq(costEstimatesTable.id, result.id))
      .execute();

    expect(costEstimates).toHaveLength(1);
    const savedCostEstimate = costEstimates[0];
    
    expect(savedCostEstimate.purchase_order_id).toEqual(approvedPurchaseOrderId);
    expect(savedCostEstimate.title).toEqual('Test Cost Estimate');
    expect(savedCostEstimate.description).toEqual('A cost estimate for testing');
    expect(parseFloat(savedCostEstimate.total_cost)).toEqual(8500.00);
    expect(savedCostEstimate.status).toEqual('DRAFT');
    expect(savedCostEstimate.created_by).toEqual(1);
    expect(savedCostEstimate.approved_by).toBeNull();
    expect(savedCostEstimate.created_at).toBeInstanceOf(Date);
    expect(savedCostEstimate.updated_at).toBeInstanceOf(Date);
  });

  it('should handle null description correctly', async () => {
    await setupTestData();
    
    const input = {
      ...testInput,
      purchase_order_id: approvedPurchaseOrderId,
      description: null
    };

    const result = await createCostEstimate(input);

    expect(result.description).toBeNull();

    // Verify in database
    const costEstimates = await db.select()
      .from(costEstimatesTable)
      .where(eq(costEstimatesTable.id, result.id))
      .execute();

    expect(costEstimates[0].description).toBeNull();
  });

  it('should reject creating cost estimate for non-existent purchase order', async () => {
    await setupTestData();
    
    const input = {
      ...testInput,
      purchase_order_id: 99999 // Non-existent ID
    };

    await expect(createCostEstimate(input)).rejects.toThrow(/purchase order not found/i);
  });

  it('should reject creating cost estimate for non-approved purchase order', async () => {
    await setupTestData();
    
    const input = {
      ...testInput,
      purchase_order_id: draftPurchaseOrderId // This PO is in DRAFT status
    };

    await expect(createCostEstimate(input)).rejects.toThrow(/purchase order must be in approved status/i);
  });

  it('should handle different purchase order statuses correctly', async () => {
    await setupTestData();

    // Create purchase orders with different statuses
    const statuses = ['PENDING_APPROVAL', 'PROGRESS', 'COMPLETED', 'REJECTED'];
    
    for (const status of statuses) {
      const poResult = await db.insert(purchaseOrdersTable)
        .values({
          po_number: `PO-${status}-001`,
          title: `Test ${status} Purchase Order`,
          description: `A ${status} purchase order for testing`,
          requested_by: testUserId,
          status: status as any,
          total_amount: '5000.00'
        })
        .returning()
        .execute();

      const input = {
        ...testInput,
        purchase_order_id: poResult[0].id
      };

      // Only APPROVED status should work
      if (status === 'APPROVED') {
        await expect(createCostEstimate(input)).resolves.toBeDefined();
      } else {
        await expect(createCostEstimate(input)).rejects.toThrow(/purchase order must be in approved status/i);
      }
    }
  });

  it('should handle numeric conversion correctly', async () => {
    await setupTestData();
    
    const input = {
      ...testInput,
      purchase_order_id: approvedPurchaseOrderId,
      total_cost: 12345.67
    };

    const result = await createCostEstimate(input);

    // Verify the numeric value is returned as a number
    expect(result.total_cost).toEqual(12345.67);
    expect(typeof result.total_cost).toBe('number');

    // Verify it's stored correctly in the database
    const costEstimates = await db.select()
      .from(costEstimatesTable)
      .where(eq(costEstimatesTable.id, result.id))
      .execute();

    expect(parseFloat(costEstimates[0].total_cost)).toEqual(12345.67);
  });
});