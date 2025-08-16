import { z } from 'zod';

// User role enum
export const userRoleEnum = z.enum(['SUPERADMIN', 'ADMIN', 'UNIT_KERJA', 'BSP', 'KKF', 'DAU']);
export type UserRole = z.infer<typeof userRoleEnum>;

// Purchase order status enum
export const purchaseOrderStatusEnum = z.enum(['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PROGRESS', 'COMPLETED', 'REJECTED']);
export type PurchaseOrderStatus = z.infer<typeof purchaseOrderStatusEnum>;

// Cost estimate status enum
export const costEstimateStatusEnum = z.enum(['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED']);
export type CostEstimateStatus = z.infer<typeof costEstimateStatusEnum>;

// User schema
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().email(),
  full_name: z.string(),
  role: userRoleEnum,
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Input schema for creating users
export const createUserInputSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  full_name: z.string().min(1).max(100),
  role: userRoleEnum,
  is_active: z.boolean().default(true)
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

// Input schema for updating users
export const updateUserInputSchema = z.object({
  id: z.number(),
  username: z.string().min(3).max(50).optional(),
  email: z.string().email().optional(),
  full_name: z.string().min(1).max(100).optional(),
  role: userRoleEnum.optional(),
  is_active: z.boolean().optional()
});

export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

// Purchase order schema
export const purchaseOrderSchema = z.object({
  id: z.number(),
  po_number: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  requested_by: z.number(),
  approved_by: z.number().nullable(),
  status: purchaseOrderStatusEnum,
  total_amount: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type PurchaseOrder = z.infer<typeof purchaseOrderSchema>;

// Input schema for creating purchase orders
export const createPurchaseOrderInputSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().nullable(),
  total_amount: z.number().positive()
});

export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderInputSchema>;

// Input schema for updating purchase orders
export const updatePurchaseOrderInputSchema = z.object({
  id: z.number(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().nullable().optional(),
  total_amount: z.number().positive().optional(),
  status: purchaseOrderStatusEnum.optional()
});

export type UpdatePurchaseOrderInput = z.infer<typeof updatePurchaseOrderInputSchema>;

// Input schema for approving purchase orders
export const approvePurchaseOrderInputSchema = z.object({
  id: z.number(),
  approved: z.boolean()
});

export type ApprovePurchaseOrderInput = z.infer<typeof approvePurchaseOrderInputSchema>;

// Cost estimate schema
export const costEstimateSchema = z.object({
  id: z.number(),
  purchase_order_id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  created_by: z.number(),
  approved_by: z.number().nullable(),
  status: costEstimateStatusEnum,
  total_cost: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type CostEstimate = z.infer<typeof costEstimateSchema>;

// Input schema for creating cost estimates
export const createCostEstimateInputSchema = z.object({
  purchase_order_id: z.number(),
  title: z.string().min(1).max(200),
  description: z.string().nullable(),
  total_cost: z.number().positive()
});

export type CreateCostEstimateInput = z.infer<typeof createCostEstimateInputSchema>;

// Input schema for updating cost estimates
export const updateCostEstimateInputSchema = z.object({
  id: z.number(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().nullable().optional(),
  total_cost: z.number().positive().optional()
});

export type UpdateCostEstimateInput = z.infer<typeof updateCostEstimateInputSchema>;

// Input schema for approving cost estimates
export const approveCostEstimateInputSchema = z.object({
  id: z.number(),
  approved: z.boolean()
});

export type ApproveCostEstimateInput = z.infer<typeof approveCostEstimateInputSchema>;

// Cost estimate line item schema
export const costEstimateLineItemSchema = z.object({
  id: z.number(),
  cost_estimate_id: z.number(),
  description: z.string(),
  quantity: z.number().int().nonnegative(),
  unit_price: z.number().positive(),
  total_price: z.number(),
  created_at: z.coerce.date()
});

export type CostEstimateLineItem = z.infer<typeof costEstimateLineItemSchema>;

// Input schema for creating cost estimate line items
export const createCostEstimateLineItemInputSchema = z.object({
  cost_estimate_id: z.number(),
  description: z.string().min(1).max(200),
  quantity: z.number().int().positive(),
  unit_price: z.number().positive()
});

export type CreateCostEstimateLineItemInput = z.infer<typeof createCostEstimateLineItemInputSchema>;

// Input schema for updating cost estimate line items
export const updateCostEstimateLineItemInputSchema = z.object({
  id: z.number(),
  description: z.string().min(1).max(200).optional(),
  quantity: z.number().int().positive().optional(),
  unit_price: z.number().positive().optional()
});

export type UpdateCostEstimateLineItemInput = z.infer<typeof updateCostEstimateLineItemInputSchema>;

// Generic ID input schema
export const idInputSchema = z.object({
  id: z.number()
});

export type IdInput = z.infer<typeof idInputSchema>;