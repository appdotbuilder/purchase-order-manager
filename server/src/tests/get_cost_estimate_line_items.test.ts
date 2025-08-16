import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, purchaseOrdersTable, costEstimatesTable, costEstimateLineItemsTable } from '../db/schema';
import { type IdInput, type CreateUserInput, type CreatePurchaseOrderInput, type CreateCostEstimateInput } from '../schema';
import { getCostEstimateLineItems } from '../handlers/get_cost_estimate_line_items';

describe('getCostEstimateLineItems', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no line items exist for cost estimate', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'BSP',
        is_active: true
      })
      .returning()
      .execute();

    const purchaseOrder = await db.insert(purchaseOrdersTable)
      .values({
        po_number: 'PO-2024-001',
        title: 'Test PO',
        description: 'Test Description',
        requested_by: user[0].id,
        status: 'DRAFT',
        total_amount: '1000.00'
      })
      .returning()
      .execute();

    const costEstimate = await db.insert(costEstimatesTable)
      .values({
        purchase_order_id: purchaseOrder[0].id,
        title: 'Test Cost Estimate',
        description: 'Test Description',
        created_by: user[0].id,
        status: 'DRAFT',
        total_cost: '500.00'
      })
      .returning()
      .execute();

    const input: IdInput = {
      id: costEstimate[0].id
    };

    const result = await getCostEstimateLineItems(input);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return line items for valid cost estimate id', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'DAU',
        is_active: true
      })
      .returning()
      .execute();

    const purchaseOrder = await db.insert(purchaseOrdersTable)
      .values({
        po_number: 'PO-2024-001',
        title: 'Test PO',
        description: 'Test Description',
        requested_by: user[0].id,
        status: 'DRAFT',
        total_amount: '1000.00'
      })
      .returning()
      .execute();

    const costEstimate = await db.insert(costEstimatesTable)
      .values({
        purchase_order_id: purchaseOrder[0].id,
        title: 'Test Cost Estimate',
        description: 'Test Description',
        created_by: user[0].id,
        status: 'DRAFT',
        total_cost: '500.00'
      })
      .returning()
      .execute();

    // Create line items
    const lineItems = await db.insert(costEstimateLineItemsTable)
      .values([
        {
          cost_estimate_id: costEstimate[0].id,
          description: 'Item 1',
          quantity: 2,
          unit_price: '100.50',
          total_price: '201.00'
        },
        {
          cost_estimate_id: costEstimate[0].id,
          description: 'Item 2',
          quantity: 1,
          unit_price: '299.00',
          total_price: '299.00'
        }
      ])
      .returning()
      .execute();

    const input: IdInput = {
      id: costEstimate[0].id
    };

    const result = await getCostEstimateLineItems(input);

    expect(result).toHaveLength(2);
    
    // Verify first line item
    const firstItem = result[0];
    expect(firstItem.id).toBeDefined();
    expect(firstItem.cost_estimate_id).toEqual(costEstimate[0].id);
    expect(firstItem.description).toEqual('Item 1');
    expect(firstItem.quantity).toEqual(2);
    expect(firstItem.unit_price).toEqual(100.50);
    expect(firstItem.total_price).toEqual(201.00);
    expect(typeof firstItem.unit_price).toBe('number');
    expect(typeof firstItem.total_price).toBe('number');
    expect(firstItem.created_at).toBeInstanceOf(Date);

    // Verify second line item
    const secondItem = result[1];
    expect(secondItem.id).toBeDefined();
    expect(secondItem.cost_estimate_id).toEqual(costEstimate[0].id);
    expect(secondItem.description).toEqual('Item 2');
    expect(secondItem.quantity).toEqual(1);
    expect(secondItem.unit_price).toEqual(299.00);
    expect(secondItem.total_price).toEqual(299.00);
    expect(typeof secondItem.unit_price).toBe('number');
    expect(typeof secondItem.total_price).toBe('number');
    expect(secondItem.created_at).toBeInstanceOf(Date);
  });

  it('should return only line items for the specified cost estimate', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'BSP',
        is_active: true
      })
      .returning()
      .execute();

    const purchaseOrder = await db.insert(purchaseOrdersTable)
      .values({
        po_number: 'PO-2024-001',
        title: 'Test PO',
        description: 'Test Description',
        requested_by: user[0].id,
        status: 'DRAFT',
        total_amount: '2000.00'
      })
      .returning()
      .execute();

    // Create two cost estimates
    const costEstimate1 = await db.insert(costEstimatesTable)
      .values({
        purchase_order_id: purchaseOrder[0].id,
        title: 'Cost Estimate 1',
        description: 'Description 1',
        created_by: user[0].id,
        status: 'DRAFT',
        total_cost: '500.00'
      })
      .returning()
      .execute();

    const costEstimate2 = await db.insert(costEstimatesTable)
      .values({
        purchase_order_id: purchaseOrder[0].id,
        title: 'Cost Estimate 2',
        description: 'Description 2',
        created_by: user[0].id,
        status: 'DRAFT',
        total_cost: '800.00'
      })
      .returning()
      .execute();

    // Create line items for both cost estimates
    await db.insert(costEstimateLineItemsTable)
      .values([
        {
          cost_estimate_id: costEstimate1[0].id,
          description: 'Item 1-1',
          quantity: 1,
          unit_price: '100.00',
          total_price: '100.00'
        },
        {
          cost_estimate_id: costEstimate1[0].id,
          description: 'Item 1-2',
          quantity: 2,
          unit_price: '200.00',
          total_price: '400.00'
        },
        {
          cost_estimate_id: costEstimate2[0].id,
          description: 'Item 2-1',
          quantity: 1,
          unit_price: '800.00',
          total_price: '800.00'
        }
      ])
      .returning()
      .execute();

    const input: IdInput = {
      id: costEstimate1[0].id
    };

    const result = await getCostEstimateLineItems(input);

    // Should only return line items for cost estimate 1
    expect(result).toHaveLength(2);
    
    result.forEach(item => {
      expect(item.cost_estimate_id).toEqual(costEstimate1[0].id);
    });

    const descriptions = result.map(item => item.description);
    expect(descriptions).toContain('Item 1-1');
    expect(descriptions).toContain('Item 1-2');
    expect(descriptions).not.toContain('Item 2-1');
  });

  it('should handle non-existent cost estimate id', async () => {
    const input: IdInput = {
      id: 99999
    };

    const result = await getCostEstimateLineItems(input);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should handle numeric conversion correctly', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'DAU',
        is_active: true
      })
      .returning()
      .execute();

    const purchaseOrder = await db.insert(purchaseOrdersTable)
      .values({
        po_number: 'PO-2024-001',
        title: 'Test PO',
        description: 'Test Description',
        requested_by: user[0].id,
        status: 'DRAFT',
        total_amount: '1000.00'
      })
      .returning()
      .execute();

    const costEstimate = await db.insert(costEstimatesTable)
      .values({
        purchase_order_id: purchaseOrder[0].id,
        title: 'Test Cost Estimate',
        description: 'Test Description',
        created_by: user[0].id,
        status: 'DRAFT',
        total_cost: '123.45'
      })
      .returning()
      .execute();

    // Create line item with decimal values
    await db.insert(costEstimateLineItemsTable)
      .values({
        cost_estimate_id: costEstimate[0].id,
        description: 'Decimal Test Item',
        quantity: 3,
        unit_price: '123.456',
        total_price: '370.37'
      })
      .returning()
      .execute();

    const input: IdInput = {
      id: costEstimate[0].id
    };

    const result = await getCostEstimateLineItems(input);

    expect(result).toHaveLength(1);
    
    const item = result[0];
    expect(typeof item.unit_price).toBe('number');
    expect(typeof item.total_price).toBe('number');
    expect(item.unit_price).toBeCloseTo(123.456);
    expect(item.total_price).toBeCloseTo(370.37);
  });
});