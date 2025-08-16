import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, purchaseOrdersTable, costEstimatesTable, costEstimateLineItemsTable } from '../db/schema';
import { type IdInput } from '../schema';
import { deleteCostEstimateLineItem } from '../handlers/delete_cost_estimate_line_item';
import { eq } from 'drizzle-orm';

describe('deleteCostEstimateLineItem', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUser: any;
  let testPurchaseOrder: any;
  let testCostEstimate: any;
  let testLineItem1: any;
  let testLineItem2: any;

  beforeEach(async () => {
    // Create test user with BSP role
    const userResult = await db.insert(usersTable)
      .values({
        username: 'bsp_user',
        email: 'bsp@test.com',
        full_name: 'BSP User',
        role: 'BSP',
        is_active: true
      })
      .returning()
      .execute();
    testUser = userResult[0];

    // Create test purchase order
    const poResult = await db.insert(purchaseOrdersTable)
      .values({
        po_number: 'PO-001',
        title: 'Test PO',
        description: 'Test purchase order',
        requested_by: testUser.id,
        total_amount: '1000.00'
      })
      .returning()
      .execute();
    testPurchaseOrder = poResult[0];

    // Create test cost estimate
    const ceResult = await db.insert(costEstimatesTable)
      .values({
        purchase_order_id: testPurchaseOrder.id,
        title: 'Test Cost Estimate',
        description: 'Test cost estimate',
        created_by: testUser.id,
        status: 'DRAFT',
        total_cost: '300.00'
      })
      .returning()
      .execute();
    testCostEstimate = ceResult[0];

    // Create test line items
    const lineItem1Result = await db.insert(costEstimateLineItemsTable)
      .values({
        cost_estimate_id: testCostEstimate.id,
        description: 'Item 1',
        quantity: 2,
        unit_price: '50.00',
        total_price: '100.00'
      })
      .returning()
      .execute();
    testLineItem1 = lineItem1Result[0];

    const lineItem2Result = await db.insert(costEstimateLineItemsTable)
      .values({
        cost_estimate_id: testCostEstimate.id,
        description: 'Item 2',
        quantity: 1,
        unit_price: '200.00',
        total_price: '200.00'
      })
      .returning()
      .execute();
    testLineItem2 = lineItem2Result[0];
  });

  it('should successfully delete a cost estimate line item', async () => {
    const input: IdInput = {
      id: testLineItem1.id
    };

    const result = await deleteCostEstimateLineItem(input);

    expect(result.success).toBe(true);

    // Verify line item was deleted
    const deletedLineItem = await db.select()
      .from(costEstimateLineItemsTable)
      .where(eq(costEstimateLineItemsTable.id, testLineItem1.id))
      .execute();

    expect(deletedLineItem).toHaveLength(0);

    // Verify other line item still exists
    const remainingLineItem = await db.select()
      .from(costEstimateLineItemsTable)
      .where(eq(costEstimateLineItemsTable.id, testLineItem2.id))
      .execute();

    expect(remainingLineItem).toHaveLength(1);
  });

  it('should update parent cost estimate total_cost after deletion', async () => {
    const input: IdInput = {
      id: testLineItem1.id
    };

    await deleteCostEstimateLineItem(input);

    // Verify cost estimate total was updated
    const updatedCostEstimate = await db.select()
      .from(costEstimatesTable)
      .where(eq(costEstimatesTable.id, testCostEstimate.id))
      .execute();

    expect(updatedCostEstimate).toHaveLength(1);
    expect(parseFloat(updatedCostEstimate[0].total_cost)).toBe(200.00); // Only item 2 remains
    expect(updatedCostEstimate[0].updated_at).toBeInstanceOf(Date);
  });

  it('should set total_cost to 0 when deleting the last line item', async () => {
    // Delete first line item
    await deleteCostEstimateLineItem({ id: testLineItem1.id });
    
    // Delete second line item
    await deleteCostEstimateLineItem({ id: testLineItem2.id });

    // Verify cost estimate total is 0
    const updatedCostEstimate = await db.select()
      .from(costEstimatesTable)
      .where(eq(costEstimatesTable.id, testCostEstimate.id))
      .execute();

    expect(updatedCostEstimate).toHaveLength(1);
    expect(parseFloat(updatedCostEstimate[0].total_cost)).toBe(0);
  });

  it('should throw error when line item does not exist', async () => {
    const input: IdInput = {
      id: 99999 // Non-existent ID
    };

    await expect(deleteCostEstimateLineItem(input))
      .rejects.toThrow(/cost estimate line item not found/i);
  });

  it('should throw error when cost estimate is not in DRAFT status', async () => {
    // Update cost estimate status to APPROVED
    await db.update(costEstimatesTable)
      .set({ status: 'APPROVED' })
      .where(eq(costEstimatesTable.id, testCostEstimate.id))
      .execute();

    const input: IdInput = {
      id: testLineItem1.id
    };

    await expect(deleteCostEstimateLineItem(input))
      .rejects.toThrow(/cannot delete line items from cost estimates that are not in draft status/i);
  });

  it('should throw error when user does not have BSP role', async () => {
    // Create user with different role
    const nonBspUser = await db.insert(usersTable)
      .values({
        username: 'admin_user',
        email: 'admin@test.com',
        full_name: 'Admin User',
        role: 'ADMIN',
        is_active: true
      })
      .returning()
      .execute();

    // Update cost estimate to be created by non-BSP user
    await db.update(costEstimatesTable)
      .set({ created_by: nonBspUser[0].id })
      .where(eq(costEstimatesTable.id, testCostEstimate.id))
      .execute();

    const input: IdInput = {
      id: testLineItem1.id
    };

    await expect(deleteCostEstimateLineItem(input))
      .rejects.toThrow(/only bsp role can delete cost estimate line items/i);
  });

  it('should throw error when user does not exist', async () => {
    // Update cost estimate to reference non-existent user
    await db.update(costEstimatesTable)
      .set({ created_by: 99999 })
      .where(eq(costEstimatesTable.id, testCostEstimate.id))
      .execute();

    const input: IdInput = {
      id: testLineItem1.id
    };

    await expect(deleteCostEstimateLineItem(input))
      .rejects.toThrow(/user not found/i);
  });

  it('should throw error when cost estimate does not exist', async () => {
    // Create orphaned line item by deleting cost estimate
    await db.delete(costEstimatesTable)
      .where(eq(costEstimatesTable.id, testCostEstimate.id))
      .execute();

    const input: IdInput = {
      id: testLineItem1.id
    };

    await expect(deleteCostEstimateLineItem(input))
      .rejects.toThrow(/cost estimate not found/i);
  });
});