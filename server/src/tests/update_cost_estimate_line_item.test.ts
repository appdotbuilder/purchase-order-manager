import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, purchaseOrdersTable, costEstimatesTable, costEstimateLineItemsTable } from '../db/schema';
import { type UpdateCostEstimateLineItemInput } from '../schema';
import { updateCostEstimateLineItem } from '../handlers/update_cost_estimate_line_item';
import { eq } from 'drizzle-orm';

describe('updateCostEstimateLineItem', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Test data setup
  let testUserId: number;
  let testPurchaseOrderId: number;
  let testCostEstimateId: number;
  let testLineItemId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable).values({
      username: 'testuser',
      email: 'test@example.com',
      full_name: 'Test User',
      role: 'BSP',
      is_active: true
    }).returning().execute();
    testUserId = userResult[0].id;

    // Create test purchase order
    const poResult = await db.insert(purchaseOrdersTable).values({
      po_number: 'PO-001',
      title: 'Test PO',
      description: 'Test purchase order',
      requested_by: testUserId,
      total_amount: '1000.00'
    }).returning().execute();
    testPurchaseOrderId = poResult[0].id;

    // Create test cost estimate
    const ceResult = await db.insert(costEstimatesTable).values({
      purchase_order_id: testPurchaseOrderId,
      title: 'Test Cost Estimate',
      description: 'Test description',
      created_by: testUserId,
      status: 'DRAFT',
      total_cost: '100.00'
    }).returning().execute();
    testCostEstimateId = ceResult[0].id;

    // Create test line item
    const lineItemResult = await db.insert(costEstimateLineItemsTable).values({
      cost_estimate_id: testCostEstimateId,
      description: 'Original item',
      quantity: 2,
      unit_price: '50.00',
      total_price: '100.00'
    }).returning().execute();
    testLineItemId = lineItemResult[0].id;
  });

  it('should update line item description only', async () => {
    const input: UpdateCostEstimateLineItemInput = {
      id: testLineItemId,
      description: 'Updated description'
    };

    const result = await updateCostEstimateLineItem(input);

    expect(result.id).toEqual(testLineItemId);
    expect(result.description).toEqual('Updated description');
    expect(result.quantity).toEqual(2);
    expect(result.unit_price).toEqual(50);
    expect(result.total_price).toEqual(100);
    expect(typeof result.unit_price).toEqual('number');
    expect(typeof result.total_price).toEqual('number');
  });

  it('should update quantity and recalculate total_price', async () => {
    const input: UpdateCostEstimateLineItemInput = {
      id: testLineItemId,
      quantity: 5
    };

    const result = await updateCostEstimateLineItem(input);

    expect(result.quantity).toEqual(5);
    expect(result.unit_price).toEqual(50);
    expect(result.total_price).toEqual(250); // 5 * 50
  });

  it('should update unit_price and recalculate total_price', async () => {
    const input: UpdateCostEstimateLineItemInput = {
      id: testLineItemId,
      unit_price: 75.50
    };

    const result = await updateCostEstimateLineItem(input);

    expect(result.quantity).toEqual(2);
    expect(result.unit_price).toEqual(75.50);
    expect(result.total_price).toEqual(151); // 2 * 75.50
  });

  it('should update multiple fields simultaneously', async () => {
    const input: UpdateCostEstimateLineItemInput = {
      id: testLineItemId,
      description: 'Completely updated item',
      quantity: 3,
      unit_price: 25.75
    };

    const result = await updateCostEstimateLineItem(input);

    expect(result.description).toEqual('Completely updated item');
    expect(result.quantity).toEqual(3);
    expect(result.unit_price).toEqual(25.75);
    expect(result.total_price).toEqual(77.25); // 3 * 25.75
  });

  it('should update parent cost estimate total_cost', async () => {
    // Add another line item to test total calculation
    await db.insert(costEstimateLineItemsTable).values({
      cost_estimate_id: testCostEstimateId,
      description: 'Second item',
      quantity: 1,
      unit_price: '200.00',
      total_price: '200.00'
    }).execute();

    // Update first line item
    const input: UpdateCostEstimateLineItemInput = {
      id: testLineItemId,
      quantity: 1,
      unit_price: 150
    };

    await updateCostEstimateLineItem(input);

    // Check that parent cost estimate total was updated
    const updatedCostEstimate = await db.select()
      .from(costEstimatesTable)
      .where(eq(costEstimatesTable.id, testCostEstimateId))
      .execute();

    expect(parseFloat(updatedCostEstimate[0].total_cost)).toEqual(350); // 150 + 200
  });

  it('should save updated data to database', async () => {
    const input: UpdateCostEstimateLineItemInput = {
      id: testLineItemId,
      description: 'Database test item',
      quantity: 10,
      unit_price: 12.99
    };

    await updateCostEstimateLineItem(input);

    // Verify data was saved to database
    const savedLineItem = await db.select()
      .from(costEstimateLineItemsTable)
      .where(eq(costEstimateLineItemsTable.id, testLineItemId))
      .execute();

    expect(savedLineItem).toHaveLength(1);
    expect(savedLineItem[0].description).toEqual('Database test item');
    expect(savedLineItem[0].quantity).toEqual(10);
    expect(parseFloat(savedLineItem[0].unit_price)).toEqual(12.99);
    expect(parseFloat(savedLineItem[0].total_price)).toEqual(129.90);
  });

  it('should throw error for non-existent line item', async () => {
    const input: UpdateCostEstimateLineItemInput = {
      id: 99999,
      description: 'Non-existent item'
    };

    expect(updateCostEstimateLineItem(input)).rejects.toThrow(/not found/i);
  });

  it('should throw error when cost estimate is not in DRAFT status', async () => {
    // Update cost estimate status to APPROVED
    await db.update(costEstimatesTable)
      .set({ status: 'APPROVED' })
      .where(eq(costEstimatesTable.id, testCostEstimateId))
      .execute();

    const input: UpdateCostEstimateLineItemInput = {
      id: testLineItemId,
      description: 'Should fail'
    };

    expect(updateCostEstimateLineItem(input)).rejects.toThrow(/not in DRAFT status/i);
  });

  it('should handle decimal calculations correctly', async () => {
    const input: UpdateCostEstimateLineItemInput = {
      id: testLineItemId,
      quantity: 3,
      unit_price: 33.33
    };

    const result = await updateCostEstimateLineItem(input);

    expect(result.total_price).toEqual(99.99); // 3 * 33.33
    expect(typeof result.total_price).toEqual('number');
  });

  it('should update parent cost estimate updated_at timestamp', async () => {
    // Get original timestamp
    const originalCostEstimate = await db.select()
      .from(costEstimatesTable)
      .where(eq(costEstimatesTable.id, testCostEstimateId))
      .execute();
    
    const originalTimestamp = originalCostEstimate[0].updated_at;

    // Wait a moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const input: UpdateCostEstimateLineItemInput = {
      id: testLineItemId,
      quantity: 5
    };

    await updateCostEstimateLineItem(input);

    // Check that updated_at was changed
    const updatedCostEstimate = await db.select()
      .from(costEstimatesTable)
      .where(eq(costEstimatesTable.id, testCostEstimateId))
      .execute();

    expect(updatedCostEstimate[0].updated_at.getTime()).toBeGreaterThan(originalTimestamp.getTime());
  });
});