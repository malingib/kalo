import { z } from "zod";

export const ZListReceiptsSchema = z.object({
  take: z.number().int().min(1).max(100).optional().default(50),
  skip: z.number().int().min(0).optional().default(0),
});

export const ZGetReceiptSchema = z.object({
  id: z.string().uuid(),
});

export const ZCreateReceiptSchema = z.object({
  bookingUid: z.string().optional().nullable(),
  customerPhone: z.string().optional().nullable(),
  customerName: z.string().optional().nullable(),
  customerEmail: z.string().email().optional().nullable(),
  lineItems: z.array(
    z.object({
      description: z.string().min(1),
      qty: z.number().min(0),
      unitPrice: z.number().min(0),
      total: z.number().min(0),
    })
  ),
  subtotal: z.number().min(0),
  platformFee: z.number().min(0).optional().default(0),
  depositPaid: z.number().min(0).optional().default(0),
  totalAmount: z.number().min(0),
  mpesaReceiptNumber: z.string().optional().nullable(),
  paymentMethod: z.string().optional().default("M-Pesa"),
  sendViaWhatsapp: z.boolean().optional().default(false),
});

export type TCreateReceiptSchema = z.infer<typeof ZCreateReceiptSchema>;
