import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import all schemas
import {
  createUserInputSchema,
  updateUserInputSchema,
  idInputSchema,
  createPurchaseOrderInputSchema,
  updatePurchaseOrderInputSchema,
  approvePurchaseOrderInputSchema,
  createCostEstimateInputSchema,
  updateCostEstimateInputSchema,
  approveCostEstimateInputSchema,
  createCostEstimateLineItemInputSchema,
  updateCostEstimateLineItemInputSchema,
} from './schema';

// Import all handlers
import { createUser } from './handlers/create_user';
import { getUsers } from './handlers/get_users';
import { getUserById } from './handlers/get_user_by_id';
import { updateUser } from './handlers/update_user';
import { deleteUser } from './handlers/delete_user';

import { createPurchaseOrder } from './handlers/create_purchase_order';
import { getPurchaseOrders } from './handlers/get_purchase_orders';
import { getPurchaseOrderById } from './handlers/get_purchase_order_by_id';
import { updatePurchaseOrder } from './handlers/update_purchase_order';
import { approvePurchaseOrder } from './handlers/approve_purchase_order';
import { deletePurchaseOrder } from './handlers/delete_purchase_order';

import { createCostEstimate } from './handlers/create_cost_estimate';
import { getCostEstimates } from './handlers/get_cost_estimates';
import { getCostEstimateById } from './handlers/get_cost_estimate_by_id';
import { updateCostEstimate } from './handlers/update_cost_estimate';
import { approveCostEstimate } from './handlers/approve_cost_estimate';
import { deleteCostEstimate } from './handlers/delete_cost_estimate';

import { createCostEstimateLineItem } from './handlers/create_cost_estimate_line_item';
import { getCostEstimateLineItems } from './handlers/get_cost_estimate_line_items';
import { updateCostEstimateLineItem } from './handlers/update_cost_estimate_line_item';
import { deleteCostEstimateLineItem } from './handlers/delete_cost_estimate_line_item';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User Management Routes
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),

  getUsers: publicProcedure
    .query(() => getUsers()),

  getUserById: publicProcedure
    .input(idInputSchema)
    .query(({ input }) => getUserById(input)),

  updateUser: publicProcedure
    .input(updateUserInputSchema)
    .mutation(({ input }) => updateUser(input)),

  deleteUser: publicProcedure
    .input(idInputSchema)
    .mutation(({ input }) => deleteUser(input)),

  // Purchase Order Management Routes
  createPurchaseOrder: publicProcedure
    .input(createPurchaseOrderInputSchema)
    .mutation(({ input }) => createPurchaseOrder(input)),

  getPurchaseOrders: publicProcedure
    .query(() => getPurchaseOrders()),

  getPurchaseOrderById: publicProcedure
    .input(idInputSchema)
    .query(({ input }) => getPurchaseOrderById(input)),

  updatePurchaseOrder: publicProcedure
    .input(updatePurchaseOrderInputSchema)
    .mutation(({ input }) => updatePurchaseOrder(input)),

  approvePurchaseOrder: publicProcedure
    .input(approvePurchaseOrderInputSchema)
    .mutation(({ input }) => approvePurchaseOrder(input)),

  deletePurchaseOrder: publicProcedure
    .input(idInputSchema)
    .mutation(({ input }) => deletePurchaseOrder(input)),

  // Cost Estimate Management Routes
  createCostEstimate: publicProcedure
    .input(createCostEstimateInputSchema)
    .mutation(({ input }) => createCostEstimate(input)),

  getCostEstimates: publicProcedure
    .query(() => getCostEstimates()),

  getCostEstimateById: publicProcedure
    .input(idInputSchema)
    .query(({ input }) => getCostEstimateById(input)),

  updateCostEstimate: publicProcedure
    .input(updateCostEstimateInputSchema)
    .mutation(({ input }) => updateCostEstimate(input)),

  approveCostEstimate: publicProcedure
    .input(approveCostEstimateInputSchema)
    .mutation(({ input }) => approveCostEstimate(input)),

  deleteCostEstimate: publicProcedure
    .input(idInputSchema)
    .mutation(({ input }) => deleteCostEstimate(input)),

  // Cost Estimate Line Item Management Routes
  createCostEstimateLineItem: publicProcedure
    .input(createCostEstimateLineItemInputSchema)
    .mutation(({ input }) => createCostEstimateLineItem(input)),

  getCostEstimateLineItems: publicProcedure
    .input(idInputSchema)
    .query(({ input }) => getCostEstimateLineItems(input)),

  updateCostEstimateLineItem: publicProcedure
    .input(updateCostEstimateLineItemInputSchema)
    .mutation(({ input }) => updateCostEstimateLineItem(input)),

  deleteCostEstimateLineItem: publicProcedure
    .input(idInputSchema)
    .mutation(({ input }) => deleteCostEstimateLineItem(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();