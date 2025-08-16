import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, purchaseOrdersTable, costEstimatesTable } from '../db/schema';
import { type ApproveCostEstimateInput } from '../schema';
import { approveCostEstimate } from '../handlers/approve_cost_estimate';
import { eq } from 'drizzle-orm';

describe('approveCostEstimate', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUser: any;
  let testPurchaseOrder: any;
  let testCostEstimate: any;

  beforeEach(async () => {
    // Create test user
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
    testUser = userResult[0];

    // Create test purchase order
    const poResult = await db.insert(purchaseOrdersTable)
      .values({
        po_number: 'PO-001',
        title: 'Test Purchase Order',
        description: 'Test description',
        requested_by: testUser.id,
        status: 'PENDING_APPROVAL',
        total_amount: '1000.00'
      })
      .returning()
      .execute();
    testPurchaseOrder = poResult[0];

    // Create test cost estimate in PENDING_APPROVAL status
    const ceResult = await db.insert(costEstimatesTable)
      .values({
        purchase_order_id: testPurchaseOrder.id,
        title: 'Test Cost Estimate',
        description: 'Test estimate description',
        created_by: testUser.id,
        status: 'PENDING_APPROVAL',
        total_cost: '1500.50'
      })
      .returning()
      .execute();
    testCostEstimate = ceResult[0];
  });

  it('should approve a cost estimate', async () => {
    const input: ApproveCostEstimateInput = {
      id: testCostEstimate.id,
      approved: true
    };

    const result = await approveCostEstimate(input);

    // Verify the result
    expect(result.id).toEqual(testCostEstimate.id);
    expect(result.status).toEqual('APPROVED');
    expect(result.approved_by).toEqual(1); // Mock approved_by value
    expect(result.total_cost).toEqual(1500.50);
    expect(typeof result.total_cost).toBe('number');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should reject a cost estimate', async () => {
    const input: ApproveCostEstimateInput = {
      id: testCostEstimate.id,
      approved: false
    };

    const result = await approveCostEstimate(input);

    // Verify the result
    expect(result.id).toEqual(testCostEstimate.id);
    expect(result.status).toEqual('REJECTED');
    expect(result.approved_by).toEqual(1); // Mock approved_by value
    expect(result.total_cost).toEqual(1500.50);
    expect(typeof result.total_cost).toBe('number');
  });

  it('should update cost estimate in database when approved', async () => {
    const input: ApproveCostEstimateInput = {
      id: testCostEstimate.id,
      approved: true
    };

    await approveCostEstimate(input);

    // Verify database was updated
    const updatedEstimate = await db.select()
      .from(costEstimatesTable)
      .where(eq(costEstimatesTable.id, testCostEstimate.id))
      .execute();

    expect(updatedEstimate).toHaveLength(1);
    expect(updatedEstimate[0].status).toEqual('APPROVED');
    expect(updatedEstimate[0].approved_by).toEqual(1);
    expect(updatedEstimate[0].updated_at).toBeInstanceOf(Date);
  });

  it('should update purchase order status to PROGRESS when cost estimate is approved', async () => {
    const input: ApproveCostEstimateInput = {
      id: testCostEstimate.id,
      approved: true
    };

    await approveCostEstimate(input);

    // Verify purchase order status was updated
    const updatedPO = await db.select()
      .from(purchaseOrdersTable)
      .where(eq(purchaseOrdersTable.id, testPurchaseOrder.id))
      .execute();

    expect(updatedPO).toHaveLength(1);
    expect(updatedPO[0].status).toEqual('PROGRESS');
    expect(updatedPO[0].updated_at).toBeInstanceOf(Date);
  });

  it('should not update purchase order status when cost estimate is rejected', async () => {
    const input: ApproveCostEstimateInput = {
      id: testCostEstimate.id,
      approved: false
    };

    await approveCostEstimate(input);

    // Verify purchase order status was not changed
    const updatedPO = await db.select()
      .from(purchaseOrdersTable)
      .where(eq(purchaseOrdersTable.id, testPurchaseOrder.id))
      .execute();

    expect(updatedPO).toHaveLength(1);
    expect(updatedPO[0].status).toEqual('PENDING_APPROVAL'); // Should remain unchanged
  });

  it('should throw error when cost estimate not found', async () => {
    const input: ApproveCostEstimateInput = {
      id: 99999,
      approved: true
    };

    await expect(approveCostEstimate(input)).rejects.toThrow(/not found/i);
  });

  it('should throw error when cost estimate is not in PENDING_APPROVAL status', async () => {
    // Update cost estimate to APPROVED status
    await db.update(costEstimatesTable)
      .set({ status: 'APPROVED' })
      .where(eq(costEstimatesTable.id, testCostEstimate.id))
      .execute();

    const input: ApproveCostEstimateInput = {
      id: testCostEstimate.id,
      approved: true
    };

    await expect(approveCostEstimate(input)).rejects.toThrow(/must be in PENDING_APPROVAL status/i);
  });

  it('should handle cost estimate with draft status error', async () => {
    // Update cost estimate to DRAFT status
    await db.update(costEstimatesTable)
      .set({ status: 'DRAFT' })
      .where(eq(costEstimatesTable.id, testCostEstimate.id))
      .execute();

    const input: ApproveCostEstimateInput = {
      id: testCostEstimate.id,
      approved: true
    };

    await expect(approveCostEstimate(input)).rejects.toThrow(/Current status: DRAFT/i);
  });

  it('should preserve other cost estimate fields when updating', async () => {
    const input: ApproveCostEstimateInput = {
      id: testCostEstimate.id,
      approved: true
    };

    const result = await approveCostEstimate(input);

    // Verify all original fields are preserved
    expect(result.purchase_order_id).toEqual(testCostEstimate.purchase_order_id);
    expect(result.title).toEqual(testCostEstimate.title);
    expect(result.description).toEqual(testCostEstimate.description);
    expect(result.created_by).toEqual(testCostEstimate.created_by);
    expect(result.created_at).toEqual(testCostEstimate.created_at);
    expect(result.total_cost).toEqual(parseFloat(testCostEstimate.total_cost));
  });
});