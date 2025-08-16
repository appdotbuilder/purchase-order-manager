import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, purchaseOrdersTable, costEstimatesTable, costEstimateLineItemsTable } from '../db/schema';
import { type CreateCostEstimateLineItemInput } from '../schema';
import { createCostEstimateLineItem } from '../handlers/create_cost_estimate_line_item';
import { eq } from 'drizzle-orm';

describe('createCostEstimateLineItem', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Create prerequisite data for tests
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

    const userId = userResult[0].id;

    // Create a test purchase order
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

    // Create a test cost estimate
    const ceResult = await db.insert(costEstimatesTable)
      .values({
        purchase_order_id: purchaseOrderId,
        title: 'Test Cost Estimate',
        description: 'Test cost estimate description',
        created_by: userId,
        status: 'DRAFT',
        total_cost: '500.00'
      })
      .returning()
      .execute();

    return {
      userId,
      purchaseOrderId,
      costEstimateId: ceResult[0].id
    };
  };

  const testInput = {
    cost_estimate_id: 1, // Will be overridden in tests
    description: 'Test Line Item',
    quantity: 5,
    unit_price: 100.00
  };

  it('should create a cost estimate line item', async () => {
    const { costEstimateId } = await setupTestData();
    
    const input: CreateCostEstimateLineItemInput = {
      ...testInput,
      cost_estimate_id: costEstimateId
    };

    const result = await createCostEstimateLineItem(input);

    // Basic field validation
    expect(result.cost_estimate_id).toEqual(costEstimateId);
    expect(result.description).toEqual('Test Line Item');
    expect(result.quantity).toEqual(5);
    expect(result.unit_price).toEqual(100.00);
    expect(result.total_price).toEqual(500.00); // 5 * 100
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);

    // Verify numeric type conversions
    expect(typeof result.unit_price).toBe('number');
    expect(typeof result.total_price).toBe('number');
  });

  it('should save line item to database', async () => {
    const { costEstimateId } = await setupTestData();
    
    const input: CreateCostEstimateLineItemInput = {
      ...testInput,
      cost_estimate_id: costEstimateId
    };

    const result = await createCostEstimateLineItem(input);

    // Query the database to verify the line item was saved
    const lineItems = await db.select()
      .from(costEstimateLineItemsTable)
      .where(eq(costEstimateLineItemsTable.id, result.id))
      .execute();

    expect(lineItems).toHaveLength(1);
    expect(lineItems[0].description).toEqual('Test Line Item');
    expect(lineItems[0].quantity).toEqual(5);
    expect(parseFloat(lineItems[0].unit_price)).toEqual(100.00);
    expect(parseFloat(lineItems[0].total_price)).toEqual(500.00);
    expect(lineItems[0].created_at).toBeInstanceOf(Date);
  });

  it('should update parent cost estimate total_cost', async () => {
    const { costEstimateId } = await setupTestData();
    
    const input: CreateCostEstimateLineItemInput = {
      ...testInput,
      cost_estimate_id: costEstimateId
    };

    await createCostEstimateLineItem(input);

    // Verify that the parent cost estimate's total_cost was updated
    const costEstimate = await db.select()
      .from(costEstimatesTable)
      .where(eq(costEstimatesTable.id, costEstimateId))
      .execute();

    expect(costEstimate).toHaveLength(1);
    // Original total_cost was 500.00, line item total is 500.00, so new total should be 1000.00
    expect(parseFloat(costEstimate[0].total_cost)).toEqual(1000.00);
    expect(costEstimate[0].updated_at).toBeInstanceOf(Date);
  });

  it('should calculate total_price correctly', async () => {
    const { costEstimateId } = await setupTestData();
    
    const input: CreateCostEstimateLineItemInput = {
      cost_estimate_id: costEstimateId,
      description: 'Complex calculation test',
      quantity: 7,
      unit_price: 123.45
    };

    const result = await createCostEstimateLineItem(input);

    const expectedTotal = 7 * 123.45; // 864.15
    expect(result.total_price).toEqual(expectedTotal);
    expect(result.quantity * result.unit_price).toEqual(result.total_price);
  });

  it('should handle decimal unit prices correctly', async () => {
    const { costEstimateId } = await setupTestData();
    
    const input: CreateCostEstimateLineItemInput = {
      cost_estimate_id: costEstimateId,
      description: 'Decimal price test',
      quantity: 3,
      unit_price: 99.99
    };

    const result = await createCostEstimateLineItem(input);

    expect(result.unit_price).toEqual(99.99);
    expect(result.total_price).toEqual(299.97); // 3 * 99.99
    expect(typeof result.unit_price).toBe('number');
    expect(typeof result.total_price).toBe('number');
  });

  it('should update parent cost estimate when multiple line items added', async () => {
    const { costEstimateId } = await setupTestData();

    // Add first line item
    const input1: CreateCostEstimateLineItemInput = {
      cost_estimate_id: costEstimateId,
      description: 'First item',
      quantity: 2,
      unit_price: 100.00
    };

    await createCostEstimateLineItem(input1);

    // Add second line item
    const input2: CreateCostEstimateLineItemInput = {
      cost_estimate_id: costEstimateId,
      description: 'Second item',
      quantity: 3,
      unit_price: 150.00
    };

    await createCostEstimateLineItem(input2);

    // Verify total cost: 500.00 (original) + 200.00 (first item) + 450.00 (second item) = 1150.00
    const costEstimate = await db.select()
      .from(costEstimatesTable)
      .where(eq(costEstimatesTable.id, costEstimateId))
      .execute();

    expect(parseFloat(costEstimate[0].total_cost)).toEqual(1150.00);
  });

  it('should throw error when cost estimate does not exist', async () => {
    const input: CreateCostEstimateLineItemInput = {
      cost_estimate_id: 999999, // Non-existent ID
      description: 'Test item',
      quantity: 1,
      unit_price: 100.00
    };

    await expect(createCostEstimateLineItem(input)).rejects.toThrow(/Cost estimate with ID 999999 not found/i);
  });

  it('should handle single quantity item', async () => {
    const { costEstimateId } = await setupTestData();
    
    const input: CreateCostEstimateLineItemInput = {
      cost_estimate_id: costEstimateId,
      description: 'Single item',
      quantity: 1,
      unit_price: 250.75
    };

    const result = await createCostEstimateLineItem(input);

    expect(result.quantity).toEqual(1);
    expect(result.unit_price).toEqual(250.75);
    expect(result.total_price).toEqual(250.75);
  });
});