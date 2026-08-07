import { z } from "zod";

// ── Inventory Items ──────────────────────────────────────────────────────────
export const ZListInventorySchema = z.object({
  includeInactive: z.boolean().optional().default(false),
});

export const ZCreateInventoryItemSchema = z.object({
  name: z.string().min(1).max(100),
  sku: z.string().max(50).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  unit: z.string().max(20).optional().default("pcs"),
  quantity: z.number().min(0).optional().default(0),
  lowStockAlert: z.number().min(0).optional().default(5),
  costPrice: z.number().min(0).optional().nullable(),
  salePrice: z.number().min(0).optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  eventTypeId: z.number().int().optional().nullable(),
});

export const ZUpdateInventoryItemSchema = ZCreateInventoryItemSchema.partial().extend({
  id: z.string().uuid(),
  isActive: z.boolean().optional(),
});

export const ZDeleteInventoryItemSchema = z.object({
  id: z.string().uuid(),
});

// ── Stock Transactions ───────────────────────────────────────────────────────
export const ZRecordStockTransactionSchema = z.object({
  itemId: z.string().uuid(),
  type: z.enum(["STOCK_IN", "STOCK_OUT", "ADJUSTMENT", "WRITE_OFF"]),
  quantity: z.number().refine((v) => v !== 0, "Quantity cannot be zero"),
  note: z.string().max(200).optional().nullable(),
  bookingUid: z.string().optional().nullable(),
});

export type TCreateInventoryItemSchema = z.infer<typeof ZCreateInventoryItemSchema>;
export type TUpdateInventoryItemSchema = z.infer<typeof ZUpdateInventoryItemSchema>;
export type TRecordStockTransactionSchema = z.infer<typeof ZRecordStockTransactionSchema>;
