import { TRPCError } from "@trpc/server";

import prisma from "@calcom/prisma";

import type { TRPCAuthedContext } from "../../../procedures/authedProcedure";
import type { TCreateReceiptSchema } from "./receipts.schema";

type Ctx = { ctx: TRPCAuthedContext };
type CreateOpts = { ctx: TRPCAuthedContext; input: TCreateReceiptSchema };

const RECEIPT_SELECT = {
  id: true,
  receiptNumber: true,
  bookingUid: true,
  customerPhone: true,
  customerName: true,
  customerEmail: true,
  lineItemsJson: true,
  subtotal: true,
  platformFee: true,
  depositPaid: true,
  totalAmount: true,
  currency: true,
  mpesaReceiptNumber: true,
  paymentMethod: true,
  issuedAt: true,
  sentViaWhatsapp: true,
  sentViaEmail: true,
  pdfUrl: true,
} as const;

/** Generate a sequential receipt number: RCP-YYYYMMDD-NNNN */
async function generateReceiptNumber(): Promise<string> {
  const today = new Date();
  const dateStr =
    today.getFullYear().toString() +
    String(today.getMonth() + 1).padStart(2, "0") +
    String(today.getDate()).padStart(2, "0");

  const prefix = `RCP-${dateStr}-`;
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const count = await prisma.receipt.count({
    where: { issuedAt: { gte: todayStart } },
  });

  return `${prefix}${String(count + 1).padStart(4, "0")}`;
}

export const listReceiptsHandler = async ({
  ctx,
  input,
}: {
  ctx: TRPCAuthedContext;
  input: { take: number; skip: number };
}) => {
  return prisma.receipt.findMany({
    where: { vendorUserId: ctx.user.id },
    select: RECEIPT_SELECT,
    orderBy: { issuedAt: "desc" },
    take: input.take,
    skip: input.skip,
  });
};

export const getReceiptHandler = async ({
  ctx,
  input,
}: {
  ctx: TRPCAuthedContext;
  input: { id: string };
}) => {
  const receipt = await prisma.receipt.findFirst({
    where: { id: input.id, vendorUserId: ctx.user.id },
    select: RECEIPT_SELECT,
  });
  if (!receipt) throw new TRPCError({ code: "NOT_FOUND", message: "Receipt not found" });
  return receipt;
};

export const createReceiptHandler = async ({ ctx, input }: CreateOpts) => {
  const receiptNumber = await generateReceiptNumber();

  const receipt = await prisma.receipt.create({
    data: {
      receiptNumber,
      vendorUserId: ctx.user.id,
      bookingUid: input.bookingUid,
      customerPhone: input.customerPhone,
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      lineItemsJson: input.lineItems,
      subtotal: input.subtotal,
      platformFee: input.platformFee,
      depositPaid: input.depositPaid,
      totalAmount: input.totalAmount,
      mpesaReceiptNumber: input.mpesaReceiptNumber,
      paymentMethod: input.paymentMethod,
      sentViaWhatsapp: input.sendViaWhatsapp,
    },
    select: RECEIPT_SELECT,
  });

  // Create a PAYMENT_RECEIVED alert for the vendor
  await prisma.alert.create({
    data: {
      userId: ctx.user.id,
      type: "PAYMENT_RECEIVED",
      channel: "IN_APP",
      title: `💰 Payment Received — ${receipt.receiptNumber}`,
      body: `KES ${receipt.totalAmount.toLocaleString()} received from ${receipt.customerName ?? receipt.customerPhone ?? "Customer"} via ${receipt.paymentMethod}.`,
      metadata: {
        receiptId: receipt.id,
        receiptNumber: receipt.receiptNumber,
        mpesaReceiptNumber: receipt.mpesaReceiptNumber,
        bookingUid: receipt.bookingUid,
      },
    },
  });

  return receipt;
};
