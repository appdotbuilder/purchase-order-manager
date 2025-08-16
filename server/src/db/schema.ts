import { serial, text, pgTable, timestamp, numeric, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['SUPERADMIN', 'ADMIN', 'UNIT_KERJA', 'BSP', 'KKF', 'DAU']);
export const purchaseOrderStatusEnum = pgEnum('purchase_order_status', ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PROGRESS', 'COMPLETED', 'REJECTED']);
export const costEstimateStatusEnum = pgEnum('cost_estimate_status', ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  full_name: text('full_name').notNull(),
  role: userRoleEnum('role').notNull(),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Purchase orders table
export const purchaseOrdersTable = pgTable('purchase_orders', {
  id: serial('id').primaryKey(),
  po_number: text('po_number').notNull().unique(),
  title: text('title').notNull(),
  description: text('description'),
  requested_by: integer('requested_by').notNull(),
  approved_by: integer('approved_by'),
  status: purchaseOrderStatusEnum('status').notNull().default('DRAFT'),
  total_amount: numeric('total_amount', { precision: 15, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Cost estimates table
export const costEstimatesTable = pgTable('cost_estimates', {
  id: serial('id').primaryKey(),
  purchase_order_id: integer('purchase_order_id').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  created_by: integer('created_by').notNull(),
  approved_by: integer('approved_by'),
  status: costEstimateStatusEnum('status').notNull().default('DRAFT'),
  total_cost: numeric('total_cost', { precision: 15, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Cost estimate line items table
export const costEstimateLineItemsTable = pgTable('cost_estimate_line_items', {
  id: serial('id').primaryKey(),
  cost_estimate_id: integer('cost_estimate_id').notNull(),
  description: text('description').notNull(),
  quantity: integer('quantity').notNull(),
  unit_price: numeric('unit_price', { precision: 15, scale: 2 }).notNull(),
  total_price: numeric('total_price', { precision: 15, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  requestedPurchaseOrders: many(purchaseOrdersTable, {
    relationName: 'requestedBy'
  }),
  approvedPurchaseOrders: many(purchaseOrdersTable, {
    relationName: 'approvedBy'
  }),
  createdCostEstimates: many(costEstimatesTable, {
    relationName: 'createdBy'
  }),
  approvedCostEstimates: many(costEstimatesTable, {
    relationName: 'approvedBy'
  }),
}));

export const purchaseOrdersRelations = relations(purchaseOrdersTable, ({ one, many }) => ({
  requestedByUser: one(usersTable, {
    fields: [purchaseOrdersTable.requested_by],
    references: [usersTable.id],
    relationName: 'requestedBy'
  }),
  approvedByUser: one(usersTable, {
    fields: [purchaseOrdersTable.approved_by],
    references: [usersTable.id],
    relationName: 'approvedBy'
  }),
  costEstimates: many(costEstimatesTable),
}));

export const costEstimatesRelations = relations(costEstimatesTable, ({ one, many }) => ({
  purchaseOrder: one(purchaseOrdersTable, {
    fields: [costEstimatesTable.purchase_order_id],
    references: [purchaseOrdersTable.id],
  }),
  createdByUser: one(usersTable, {
    fields: [costEstimatesTable.created_by],
    references: [usersTable.id],
    relationName: 'createdBy'
  }),
  approvedByUser: one(usersTable, {
    fields: [costEstimatesTable.approved_by],
    references: [usersTable.id],
    relationName: 'approvedBy'
  }),
  lineItems: many(costEstimateLineItemsTable),
}));

export const costEstimateLineItemsRelations = relations(costEstimateLineItemsTable, ({ one }) => ({
  costEstimate: one(costEstimatesTable, {
    fields: [costEstimateLineItemsTable.cost_estimate_id],
    references: [costEstimatesTable.id],
  }),
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
export type PurchaseOrder = typeof purchaseOrdersTable.$inferSelect;
export type NewPurchaseOrder = typeof purchaseOrdersTable.$inferInsert;
export type CostEstimate = typeof costEstimatesTable.$inferSelect;
export type NewCostEstimate = typeof costEstimatesTable.$inferInsert;
export type CostEstimateLineItem = typeof costEstimateLineItemsTable.$inferSelect;
export type NewCostEstimateLineItem = typeof costEstimateLineItemsTable.$inferInsert;

// Export all tables for proper query building
export const tables = {
  users: usersTable,
  purchaseOrders: purchaseOrdersTable,
  costEstimates: costEstimatesTable,
  costEstimateLineItems: costEstimateLineItemsTable,
};