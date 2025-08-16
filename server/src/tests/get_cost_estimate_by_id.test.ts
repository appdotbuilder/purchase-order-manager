import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, purchaseOrdersTable, costEstimatesTable } from '../db/schema';
import { type IdInput } from '../schema';
import { getCostEstimateById } from '../handlers/get_cost_estimate_by_id';
import { eq } from 'drizzle-orm';

describe('getCostEstimateById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return cost estimate by ID', async () => {
    // Create prerequisite user
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
    const userId = userResult[0].id;

    // Create prerequisite purchase order
    const poResult = await db.insert(purchaseOrdersTable)
      .values({
        po_number: 'PO-001',
        title: 'Test Purchase Order',
        description: 'Test description',
        requested_by: userId,
        status: 'DRAFT',
        total_amount: '1000.00'
      })
      .returning()
      .execute();
    const purchaseOrderId = poResult[0].id;

    // Create cost estimate
    const costEstimateResult = await db.insert(costEstimatesTable)
      .values({
        purchase_order_id: purchaseOrderId,
        title: 'Test Cost Estimate',
        description: 'Test cost estimate description',
        created_by: userId,
        status: 'DRAFT',
        total_cost: '1250.75'
      })
      .returning()
      .execute();
    const costEstimateId = costEstimateResult[0].id;

    // Test the handler
    const input: IdInput = { id: costEstimateId };
    const result = await getCostEstimateById(input);

    // Verify result
    expect(result).not.toBeNull();
    expect(result!.id).toBe(costEstimateId);
    expect(result!.purchase_order_id).toBe(purchaseOrderId);
    expect(result!.title).toBe('Test Cost Estimate');
    expect(result!.description).toBe('Test cost estimate description');
    expect(result!.created_by).toBe(userId);
    expect(result!.approved_by).toBeNull();
    expect(result!.status).toBe('DRAFT');
    expect(result!.total_cost).toBe(1250.75);
    expect(typeof result!.total_cost).toBe('number');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null for non-existent cost estimate', async () => {
    const input: IdInput = { id: 999999 };
    const result = await getCostEstimateById(input);

    expect(result).toBeNull();
  });

  it('should handle cost estimate with null description', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser2',
        email: 'test2@example.com',
        full_name: 'Test User 2',
        role: 'DAU',
        is_active: true
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create prerequisite purchase order
    const poResult = await db.insert(purchaseOrdersTable)
      .values({
        po_number: 'PO-002',
        title: 'Test Purchase Order 2',
        description: null,
        requested_by: userId,
        status: 'DRAFT',
        total_amount: '2000.00'
      })
      .returning()
      .execute();
    const purchaseOrderId = poResult[0].id;

    // Create cost estimate with null description
    const costEstimateResult = await db.insert(costEstimatesTable)
      .values({
        purchase_order_id: purchaseOrderId,
        title: 'Cost Estimate Without Description',
        description: null,
        created_by: userId,
        status: 'PENDING_APPROVAL',
        total_cost: '500.25'
      })
      .returning()
      .execute();
    const costEstimateId = costEstimateResult[0].id;

    // Test the handler
    const input: IdInput = { id: costEstimateId };
    const result = await getCostEstimateById(input);

    // Verify result
    expect(result).not.toBeNull();
    expect(result!.id).toBe(costEstimateId);
    expect(result!.title).toBe('Cost Estimate Without Description');
    expect(result!.description).toBeNull();
    expect(result!.status).toBe('PENDING_APPROVAL');
    expect(result!.total_cost).toBe(500.25);
    expect(typeof result!.total_cost).toBe('number');
  });

  it('should handle approved cost estimate with approver', async () => {
    // Create prerequisite users
    const creatorResult = await db.insert(usersTable)
      .values({
        username: 'creator',
        email: 'creator@example.com',
        full_name: 'Creator User',
        role: 'BSP',
        is_active: true
      })
      .returning()
      .execute();
    const creatorId = creatorResult[0].id;

    const approverResult = await db.insert(usersTable)
      .values({
        username: 'approver',
        email: 'approver@example.com',
        full_name: 'Approver User',
        role: 'ADMIN',
        is_active: true
      })
      .returning()
      .execute();
    const approverId = approverResult[0].id;

    // Create prerequisite purchase order
    const poResult = await db.insert(purchaseOrdersTable)
      .values({
        po_number: 'PO-003',
        title: 'Approved Purchase Order',
        description: 'Approved PO description',
        requested_by: creatorId,
        approved_by: approverId,
        status: 'APPROVED',
        total_amount: '5000.00'
      })
      .returning()
      .execute();
    const purchaseOrderId = poResult[0].id;

    // Create approved cost estimate
    const costEstimateResult = await db.insert(costEstimatesTable)
      .values({
        purchase_order_id: purchaseOrderId,
        title: 'Approved Cost Estimate',
        description: 'This estimate has been approved',
        created_by: creatorId,
        approved_by: approverId,
        status: 'APPROVED',
        total_cost: '4750.50'
      })
      .returning()
      .execute();
    const costEstimateId = costEstimateResult[0].id;

    // Test the handler
    const input: IdInput = { id: costEstimateId };
    const result = await getCostEstimateById(input);

    // Verify result
    expect(result).not.toBeNull();
    expect(result!.id).toBe(costEstimateId);
    expect(result!.title).toBe('Approved Cost Estimate');
    expect(result!.created_by).toBe(creatorId);
    expect(result!.approved_by).toBe(approverId);
    expect(result!.status).toBe('APPROVED');
    expect(result!.total_cost).toBe(4750.50);
    expect(typeof result!.total_cost).toBe('number');
  });

  it('should verify cost estimate exists in database after retrieval', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'verifyuser',
        email: 'verify@example.com',
        full_name: 'Verify User',
        role: 'DAU',
        is_active: true
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create prerequisite purchase order
    const poResult = await db.insert(purchaseOrdersTable)
      .values({
        po_number: 'PO-VERIFY',
        title: 'Verification Purchase Order',
        description: 'For verification test',
        requested_by: userId,
        status: 'DRAFT',
        total_amount: '300.00'
      })
      .returning()
      .execute();
    const purchaseOrderId = poResult[0].id;

    // Create cost estimate
    const costEstimateResult = await db.insert(costEstimatesTable)
      .values({
        purchase_order_id: purchaseOrderId,
        title: 'Verification Cost Estimate',
        description: 'For database verification',
        created_by: userId,
        status: 'DRAFT',
        total_cost: '275.99'
      })
      .returning()
      .execute();
    const costEstimateId = costEstimateResult[0].id;

    // Get cost estimate via handler
    const input: IdInput = { id: costEstimateId };
    const result = await getCostEstimateById(input);

    // Verify the result exists
    expect(result).not.toBeNull();

    // Verify it matches database record
    const dbResults = await db.select()
      .from(costEstimatesTable)
      .where(eq(costEstimatesTable.id, costEstimateId))
      .execute();

    expect(dbResults).toHaveLength(1);
    const dbRecord = dbResults[0];
    
    expect(result!.id).toBe(dbRecord.id);
    expect(result!.purchase_order_id).toBe(dbRecord.purchase_order_id);
    expect(result!.title).toBe(dbRecord.title);
    expect(result!.description).toBe(dbRecord.description);
    expect(result!.created_by).toBe(dbRecord.created_by);
    expect(result!.status).toBe(dbRecord.status);
    expect(result!.total_cost).toBe(parseFloat(dbRecord.total_cost));
    expect(result!.created_at.getTime()).toBe(dbRecord.created_at.getTime());
    expect(result!.updated_at.getTime()).toBe(dbRecord.updated_at.getTime());
  });
});