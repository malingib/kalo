import authedProcedure, { authedAdminProcedure } from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import {
  ZDismissAlertSchema,
  ZListAlertsSchema,
  ZMarkAlertsReadSchema,
  ZUpdateAlertPreferencesSchema,
} from "./alerts.schema";
import {
  ZCreateInventoryItemSchema,
  ZDeleteInventoryItemSchema,
  ZListInventorySchema,
  ZRecordStockTransactionSchema,
  ZUpdateInventoryItemSchema,
} from "./inventory.schema";
import { ZCreateReceiptSchema, ZGetReceiptSchema, ZListReceiptsSchema } from "./receipts.schema";
import {
  ZApproveVendorSchema,
  ZGetVendorProfileSchema,
  ZUpsertVendorProfileSchema,
} from "./vendorProfile.schema";

export const vendorRouter = router({
  // ── Profile ─────────────────────────────────────────────────────────────────
  getProfile: authedProcedure.input(ZGetVendorProfileSchema).query(async (opts) => {
    const { getVendorProfileHandler } = await import("./vendorProfile.handler");
    return getVendorProfileHandler(opts);
  }),
  upsertProfile: authedProcedure.input(ZUpsertVendorProfileSchema).mutation(async (opts) => {
    const { upsertVendorProfileHandler } = await import("./vendorProfile.handler");
    return upsertVendorProfileHandler(opts);
  }),

  // ── Admin: Vendor Management ─────────────────────────────────────────────────
  listVendors: authedAdminProcedure.query(async (opts) => {
    const { listVendorsHandler } = await import("./vendorProfile.handler");
    return listVendorsHandler(opts);
  }),
  approveVendor: authedAdminProcedure.input(ZApproveVendorSchema).mutation(async (opts) => {
    const { approveVendorHandler } = await import("./vendorProfile.handler");
    return approveVendorHandler(opts);
  }),

  // ── Inventory ────────────────────────────────────────────────────────────────
  listInventory: authedProcedure.input(ZListInventorySchema).query(async (opts) => {
    const { listInventoryHandler } = await import("./inventory.handler");
    return listInventoryHandler(opts);
  }),
  createInventoryItem: authedProcedure.input(ZCreateInventoryItemSchema).mutation(async (opts) => {
    const { createInventoryItemHandler } = await import("./inventory.handler");
    return createInventoryItemHandler(opts);
  }),
  updateInventoryItem: authedProcedure.input(ZUpdateInventoryItemSchema).mutation(async (opts) => {
    const { updateInventoryItemHandler } = await import("./inventory.handler");
    return updateInventoryItemHandler(opts);
  }),
  deleteInventoryItem: authedProcedure.input(ZDeleteInventoryItemSchema).mutation(async (opts) => {
    const { deleteInventoryItemHandler } = await import("./inventory.handler");
    return deleteInventoryItemHandler(opts);
  }),
  recordStockTransaction: authedProcedure.input(ZRecordStockTransactionSchema).mutation(async (opts) => {
    const { recordStockTransactionHandler } = await import("./inventory.handler");
    return recordStockTransactionHandler(opts);
  }),

  // ── Receipts ─────────────────────────────────────────────────────────────────
  listReceipts: authedProcedure.input(ZListReceiptsSchema).query(async (opts) => {
    const { listReceiptsHandler } = await import("./receipts.handler");
    return listReceiptsHandler(opts);
  }),
  getReceipt: authedProcedure.input(ZGetReceiptSchema).query(async (opts) => {
    const { getReceiptHandler } = await import("./receipts.handler");
    return getReceiptHandler(opts);
  }),
  createReceipt: authedProcedure.input(ZCreateReceiptSchema).mutation(async (opts) => {
    const { createReceiptHandler } = await import("./receipts.handler");
    return createReceiptHandler(opts);
  }),

  // ── Alerts ────────────────────────────────────────────────────────────────────
  listAlerts: authedProcedure.input(ZListAlertsSchema).query(async (opts) => {
    const { listAlertsHandler } = await import("./alerts.handler");
    return listAlertsHandler(opts);
  }),
  getUnreadAlertsCount: authedProcedure.query(async (opts) => {
    const { getUnreadAlertsCountHandler } = await import("./alerts.handler");
    return getUnreadAlertsCountHandler(opts);
  }),
  markAlertsRead: authedProcedure.input(ZMarkAlertsReadSchema).mutation(async (opts) => {
    const { markAlertsReadHandler } = await import("./alerts.handler");
    return markAlertsReadHandler(opts);
  }),
  dismissAlert: authedProcedure.input(ZDismissAlertSchema).mutation(async (opts) => {
    const { dismissAlertHandler } = await import("./alerts.handler");
    return dismissAlertHandler(opts);
  }),
  getAlertPreferences: authedProcedure.query(async (opts) => {
    const { getAlertPreferencesHandler } = await import("./alerts.handler");
    return getAlertPreferencesHandler(opts);
  }),
  updateAlertPreferences: authedProcedure.input(ZUpdateAlertPreferencesSchema).mutation(async (opts) => {
    const { updateAlertPreferencesHandler } = await import("./alerts.handler");
    return updateAlertPreferencesHandler(opts);
  }),
});
