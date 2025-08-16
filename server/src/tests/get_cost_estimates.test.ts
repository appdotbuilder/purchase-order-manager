import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, purchaseOrdersTable, costEstimatesTable } from '../db/schema';
import { getCostEstimates } from '../handlers/get_cost_estimates';

describe('getCostEstimates', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let bspUser: any;
  let dauUser: any;
  let adminUser: any;
  let purchaseOrder: any;
  let costEstimate1: any;
  let costEstimate2: any;

  beforeEach(async () => {
    // Create test users with different roles
    const users = await db.insert(usersTable)
      .values([
        {
          username: 'bsp_user',
          email: 'bsp@test.com',
          full_name: 'BSP User',
          role: 'BSP',
          is_active: true
        },
        {
          username: 'dau_user',
          email: 'dau@test.com',
          full_name: 'DAU User',
          role: 'DAU',
          is_active: true
        },
        {
          username: 'admin_user',
          email: 'admin@test.com',
          full_name: 'Admin User',
          role: 'ADMIN',
          is_active: true
        }
      ])
      .returning()
      .execute();

    [bspUser, dauUser, adminUser] = users;

    // Create test purchase order
    const purchaseOrders = await db.insert(purchaseOrdersTable)
      .values({
        po_number: 'PO-2024-001',
        title: 'Test Purchase Order',
        description: 'Test description',
        requested_by: bspUser.id,
        status: 'DRAFT',
        total_amount: '10000.00'
      })
      .returning()
      .execute();

    purchaseOrder = purchaseOrders[0];

    // Create test cost estimates
    const costEstimates = await db.insert(costEstimatesTable)
      .values([
        {
          purchase_order_id: purchaseOrder.id,
          title: 'Cost Estimate 1',
          description: 'First cost estimate',
          created_by: bspUser.id,
          status: 'DRAFT',
          total_cost: '5000.00'
        },
        {
          purchase_order_id: purchaseOrder.id,
          title: 'Cost Estimate 2',
          description: 'Second cost estimate',
          created_by: dauUser.id,
          status: 'PENDING_APPROVAL',
          total_cost: '7500.50'
        }
      ])
      .returning()
      .execute();

    [costEstimate1, costEstimate2] = costEstimates;
  });

  it('should fetch all cost estimates', async () => {
    const result = await getCostEstimates();

    expect(result).toHaveLength(2);
    
    // Verify first cost estimate
    const firstEstimate = result.find(ce => ce.id === costEstimate1.id);
    expect(firstEstimate).toBeDefined();
    expect(firstEstimate!.title).toBe('Cost Estimate 1');
    expect(firstEstimate!.description).toBe('First cost estimate');
    expect(firstEstimate!.purchase_order_id).toBe(purchaseOrder.id);
    expect(firstEstimate!.created_by).toBe(bspUser.id);
    expect(firstEstimate!.status).toBe('DRAFT');
    expect(firstEstimate!.total_cost).toBe(5000.00);
    expect(typeof firstEstimate!.total_cost).toBe('number');
    expect(firstEstimate!.created_at).toBeInstanceOf(Date);
    expect(firstEstimate!.updated_at).toBeInstanceOf(Date);

    // Verify second cost estimate
    const secondEstimate = result.find(ce => ce.id === costEstimate2.id);
    expect(secondEstimate).toBeDefined();
    expect(secondEstimate!.title).toBe('Cost Estimate 2');
    expect(secondEstimate!.description).toBe('Second cost estimate');
    expect(secondEstimate!.created_by).toBe(dauUser.id);
    expect(secondEstimate!.status).toBe('PENDING_APPROVAL');
    expect(secondEstimate!.total_cost).toBe(7500.50);
    expect(typeof secondEstimate!.total_cost).toBe('number');
  });

  it('should return proper data types for all fields', async () => {
    const result = await getCostEstimates();

    expect(result).toHaveLength(2);
    expect(result.every(ce => typeof ce.total_cost === 'number')).toBe(true);
    expect(result.every(ce => ce.created_at instanceof Date)).toBe(true);
    expect(result.every(ce => ce.updated_at instanceof Date)).toBe(true);
  });

  it('should include all required fields in results', async () => {
    const result = await getCostEstimates();

    expect(result).toHaveLength(2);
    
    result.forEach(costEstimate => {
      expect(costEstimate.id).toBeDefined();
      expect(costEstimate.purchase_order_id).toBeDefined();
      expect(costEstimate.title).toBeDefined();
      expect(costEstimate.created_by).toBeDefined();
      expect(costEstimate.status).toBeDefined();
      expect(costEstimate.total_cost).toBeDefined();
      expect(costEstimate.created_at).toBeInstanceOf(Date);
      expect(costEstimate.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should return empty array when no cost estimates exist', async () => {
    // Clear all cost estimates
    await db.delete(costEstimatesTable).execute();

    const result = await getCostEstimates();
    expect(result).toHaveLength(0);
  });

  it('should handle cost estimates with null descriptions', async () => {
    // Create cost estimate with null description
    const costEstimate = await db.insert(costEstimatesTable)
      .values({
        purchase_order_id: purchaseOrder.id,
        title: 'Cost Estimate with Null Description',
        description: null,
        created_by: bspUser.id,
        status: 'DRAFT',
        total_cost: '3000.00'
      })
      .returning()
      .execute();

    const result = await getCostEstimates();
    
    const nullDescEstimate = result.find(ce => ce.id === costEstimate[0].id);
    expect(nullDescEstimate).toBeDefined();
    expect(nullDescEstimate!.description).toBeNull();
    expect(nullDescEstimate!.title).toBe('Cost Estimate with Null Description');
  });

  it('should handle cost estimates with different statuses', async () => {
    // Create cost estimates with different statuses
    await db.insert(costEstimatesTable)
      .values([
        {
          purchase_order_id: purchaseOrder.id,
          title: 'Approved Estimate',
          description: 'Approved estimate',
          created_by: bspUser.id,
          approved_by: dauUser.id,
          status: 'APPROVED',
          total_cost: '8000.00'
        },
        {
          purchase_order_id: purchaseOrder.id,
          title: 'Rejected Estimate',
          description: 'Rejected estimate',
          created_by: dauUser.id,
          status: 'REJECTED',
          total_cost: '4000.00'
        }
      ])
      .execute();

    const result = await getCostEstimates();
    
    expect(result.length).toBeGreaterThanOrEqual(4); // Original 2 + 2 new ones
    
    const approvedEstimate = result.find(ce => ce.title === 'Approved Estimate');
    expect(approvedEstimate).toBeDefined();
    expect(approvedEstimate!.status).toBe('APPROVED');
    expect(approvedEstimate!.approved_by).toBe(dauUser.id);

    const rejectedEstimate = result.find(ce => ce.title === 'Rejected Estimate');
    expect(rejectedEstimate).toBeDefined();
    expect(rejectedEstimate!.status).toBe('REJECTED');
    expect(rejectedEstimate!.approved_by).toBeNull();
  });
});