import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, purchaseOrdersTable, costEstimatesTable, costEstimateLineItemsTable } from '../db/schema';
import { type UpdateCostEstimateInput } from '../schema';
import { updateCostEstimate } from '../handlers/update_cost_estimate';
import { eq } from 'drizzle-orm';

// Test users
const testUser = {
  username: 'testuser',
  email: 'test@example.com',
  full_name: 'Test User',
  role: 'BSP' as const,
  is_active: true
};

const testPurchaseOrder = {
  po_number: 'PO-001',
  title: 'Test Purchase Order',
  description: 'Test description',
  requested_by: 1,
  status: 'APPROVED' as const,
  total_amount: '1000.00'
};

const testCostEstimate = {
  purchase_order_id: 1,
  title: 'Original Cost Estimate',
  description: 'Original description',
  created_by: 1,
  status: 'DRAFT' as const,
  total_cost: '500.00'
};

describe('updateCostEstimate', () => {
  let userId: number;
  let purchaseOrderId: number;
  let costEstimateId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    userId = userResult[0].id;

    // Create test purchase order
    const poResult = await db.insert(purchaseOrdersTable)
      .values({
        ...testPurchaseOrder,
        requested_by: userId
      })
      .returning()
      .execute();
    purchaseOrderId = poResult[0].id;

    // Create test cost estimate
    const ceResult = await db.insert(costEstimatesTable)
      .values({
        ...testCostEstimate,
        purchase_order_id: purchaseOrderId,
        created_by: userId
      })
      .returning()
      .execute();
    costEstimateId = ceResult[0].id;
  });

  afterEach(resetDB);

  it('should update cost estimate title successfully', async () => {
    const input: UpdateCostEstimateInput = {
      id: costEstimateId,
      title: 'Updated Cost Estimate Title'
    };

    const result = await updateCostEstimate(input);

    expect(result.id).toBe(costEstimateId);
    expect(result.title).toBe('Updated Cost Estimate Title');
    expect(result.description).toBe('Original description');
    expect(result.total_cost).toBe(500.00);
    expect(typeof result.total_cost).toBe('number');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update cost estimate description successfully', async () => {
    const input: UpdateCostEstimateInput = {
      id: costEstimateId,
      description: 'Updated description'
    };

    const result = await updateCostEstimate(input);

    expect(result.id).toBe(costEstimateId);
    expect(result.title).toBe('Original Cost Estimate');
    expect(result.description).toBe('Updated description');
    expect(result.total_cost).toBe(500.00);
  });

  it('should update cost estimate total_cost successfully', async () => {
    const input: UpdateCostEstimateInput = {
      id: costEstimateId,
      total_cost: 750.50
    };

    const result = await updateCostEstimate(input);

    expect(result.id).toBe(costEstimateId);
    expect(result.title).toBe('Original Cost Estimate');
    expect(result.description).toBe('Original description');
    expect(result.total_cost).toBe(750.50);
    expect(typeof result.total_cost).toBe('number');
  });

  it('should update multiple fields successfully', async () => {
    const input: UpdateCostEstimateInput = {
      id: costEstimateId,
      title: 'Completely Updated Title',
      description: 'Completely updated description',
      total_cost: 999.99
    };

    const result = await updateCostEstimate(input);

    expect(result.id).toBe(costEstimateId);
    expect(result.title).toBe('Completely Updated Title');
    expect(result.description).toBe('Completely updated description');
    expect(result.total_cost).toBe(999.99);
    expect(typeof result.total_cost).toBe('number');
  });

  it('should handle null description update', async () => {
    const input: UpdateCostEstimateInput = {
      id: costEstimateId,
      description: null
    };

    const result = await updateCostEstimate(input);

    expect(result.id).toBe(costEstimateId);
    expect(result.title).toBe('Original Cost Estimate');
    expect(result.description).toBeNull();
    expect(result.total_cost).toBe(500.00);
  });

  it('should save updates to database', async () => {
    const input: UpdateCostEstimateInput = {
      id: costEstimateId,
      title: 'Database Test Title',
      total_cost: 888.88
    };

    await updateCostEstimate(input);

    const costEstimates = await db.select()
      .from(costEstimatesTable)
      .where(eq(costEstimatesTable.id, costEstimateId))
      .execute();

    expect(costEstimates).toHaveLength(1);
    expect(costEstimates[0].title).toBe('Database Test Title');
    expect(parseFloat(costEstimates[0].total_cost)).toBe(888.88);
    expect(costEstimates[0].updated_at).toBeInstanceOf(Date);
  });

  it('should recalculate total_cost from line items when not provided', async () => {
    // Create some line items
    await db.insert(costEstimateLineItemsTable)
      .values([
        {
          cost_estimate_id: costEstimateId,
          description: 'Item 1',
          quantity: 2,
          unit_price: '100.00',
          total_price: '200.00'
        },
        {
          cost_estimate_id: costEstimateId,
          description: 'Item 2',
          quantity: 3,
          unit_price: '150.00',
          total_price: '450.00'
        }
      ])
      .execute();

    const input: UpdateCostEstimateInput = {
      id: costEstimateId,
      title: 'Updated with line items'
    };

    const result = await updateCostEstimate(input);

    expect(result.title).toBe('Updated with line items');
    expect(result.total_cost).toBe(650.00); // 200 + 450
    expect(typeof result.total_cost).toBe('number');
  });

  it('should throw error when cost estimate not found', async () => {
    const input: UpdateCostEstimateInput = {
      id: 99999,
      title: 'Non-existent'
    };

    await expect(updateCostEstimate(input)).rejects.toThrow(/not found/i);
  });

  it('should throw error when trying to update non-DRAFT status', async () => {
    // Update cost estimate to APPROVED status
    await db.update(costEstimatesTable)
      .set({ status: 'APPROVED' })
      .where(eq(costEstimatesTable.id, costEstimateId))
      .execute();

    const input: UpdateCostEstimateInput = {
      id: costEstimateId,
      title: 'Should fail'
    };

    await expect(updateCostEstimate(input)).rejects.toThrow(/DRAFT status/i);
  });

  it('should preserve original total when no line items exist', async () => {
    const input: UpdateCostEstimateInput = {
      id: costEstimateId,
      title: 'No line items test'
    };

    const result = await updateCostEstimate(input);

    expect(result.title).toBe('No line items test');
    expect(result.total_cost).toBe(500.00); // Should preserve original total
    expect(typeof result.total_cost).toBe('number');
  });
});