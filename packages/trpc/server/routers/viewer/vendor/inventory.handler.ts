import { TRPCError } from "@trpc/server";

import prisma from "@calcom/prisma";

import type { TRPCAuthedContext } from "../../../procedures/authedProcedure";
import type {
  TCreateInventoryItemSchema,
  TRecordStockTransactionSchema,
  TUpdateInventoryItemSchema,
} from "./inventory.schema";

type Ctx = { ctx: TRPCAuthedContext };
type CreateOpts = { ctx: TRPCAuthedContext; input: TCreateInventoryItemSchema };
type UpdateOpts = { ctx: TRPCAuthedContext; input: TUpdateInventoryItemSchema };
type TxOpts = { ctx: TRPCAuthedContext; input: TRecordStockTransactionSchema };

const ITEM_SELECT = {
  id: true,
  name: true,
  sku: true,
  description: true,
  unit: true,
  quantity: true,
  lowStockAlert: true,
  costPrice: true,
  salePrice: true,
  imageUrl: true,
  isActive: true,
  eventTypeId: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const listInventoryHandler = async ({ ctx }: Ctx) => {
  return prisma.inventoryItem.findMany({
    where: { vendorUserId: ctx.user.id },
    select: ITEM_SELECT,
    orderBy: { name: "asc" },
  });
};

export const createInventoryItemHandler = async ({ ctx, input }: CreateOpts) => {
  return prisma.inventoryItem.create({
    data: { vendorUserId: ctx.user.id, ...input },
    select: ITEM_SELECT,
  });
};

export const updateInventoryItemHandler = async ({ ctx, input }: UpdateOpts) => {
  const { id, ...data } = input;

  // Ownership guard
  const existing = await prisma.inventoryItem.findFirst({
    where: { id, vendorUserId: ctx.user.id },
    select: { id: true },
  });
  if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Inventory item not found" });

  return prisma.inventoryItem.update({ where: { id }, data, select: ITEM_SELECT });
};

export const deleteInventoryItemHandler = async ({
  ctx,
  input,
}: {
  ctx: TRPCAuthedContext;
  input: { id: string };
}) => {
  const existing = await prisma.inventoryItem.findFirst({
    where: { id: input.id, vendorUserId: ctx.user.id },
    select: { id: true },
  });
  if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Inventory item not found" });

  await prisma.inventoryItem.delete({ where: { id: input.id } });
  return { success: true };
};

export const recordStockTransactionHandler = async ({ ctx, input }: TxOpts) => {
  // Ownership guard
  const item = await prisma.inventoryItem.findFirst({
    where: { id: input.itemId, vendorUserId: ctx.user.id },
    select: { id: true, quantity: true, lowStockAlert: true, name: true },
  });
  if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Inventory item not found" });

  // Determine signed quantity (OUT and WRITE_OFF are always negative)
  const absQty = Math.abs(input.quantity);
  const signedQty =
    input.type === "STOCK_IN" ? absQty : -absQty;

  const newQuantity = item.quantity + signedQty;
  if (newQuantity < 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Insufficient stock. Available: ${item.quantity} ${input.type === "STOCK_OUT" ? "units" : ""}`,
    });
  }

  const [tx] = await prisma.$transaction([
    prisma.inventoryTransaction.create({
      data: {
        itemId: input.itemId,
        type: input.type as any,
        quantity: signedQty,
        note: input.note,
        bookingUid: input.bookingUid,
      },
    }),
    prisma.inventoryItem.update({
      where: { id: input.itemId },
      data: { quantity: newQuantity },
    }),
  ]);

  // Fire a low-stock alert if threshold crossed
  if (newQuantity <= item.lowStockAlert && newQuantity >= 0) {
    await prisma.alert.create({
      data: {
        userId: ctx.user.id,
        type: "LOW_STOCK",
        channel: "IN_APP",
        title: `Low Stock: ${item.name}`,
        body: `Only ${newQuantity} ${input.quantity === 1 ? "unit" : "units"} remaining (threshold: ${item.lowStockAlert}).`,
        metadata: { itemId: input.itemId, inventoryItemName: item.name, quantity: newQuantity },
      },
    });
  }

  return tx;
};
