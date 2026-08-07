import { z } from "zod";

export const ZGetVendorProfileSchema = z.object({});

export const ZUpsertVendorProfileSchema = z.object({
  // Storefront
  businessName: z.string().min(2).max(100).optional(),
  businessSlug: z
    .string()
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase with hyphens only")
    .min(2)
    .max(50)
    .optional(),
  businessBio: z.string().max(500).optional().nullable(),
  logoUrl: z.string().url().optional().nullable(),
  coverImageUrl: z.string().url().optional().nullable(),
  locationText: z.string().max(200).optional().nullable(),
  locationLat: z.number().optional().nullable(),
  locationLng: z.number().optional().nullable(),
  currency: z.string().max(3).optional(),
  timezone: z.string().optional(),

  // Tenant M-Pesa (own payments)
  mpesaTillNumber: z.string().max(10).optional().nullable(),
  mpesaPaybill: z.string().max(10).optional().nullable(),
  mpesaAccountName: z.string().max(50).optional().nullable(),
  mpesaPayoutPhone: z.string().max(15).optional().nullable(),
  // Own Daraja keys (only for Pro plan vendors)
  darajaConsumerKey: z.string().optional().nullable(),
  darajaConsumerSecret: z.string().optional().nullable(),
  darajaShortcode: z.string().optional().nullable(),
  darajaPasskey: z.string().optional().nullable(),

  // WhatsApp Automation
  whatsappEnabled: z.boolean().optional(),
  whatsappGreeting: z.string().max(500).optional().nullable(),
  whatsappFaqJson: z
    .array(
      z.object({
        question: z.string().max(200),
        answer: z.string().max(500),
      })
    )
    .optional()
    .nullable(),
  whatsappOfflineMessage: z.string().max(300).optional().nullable(),
  whatsappAutoConfirm: z.boolean().optional(),

  // Operating Hours
  operatingHoursJson: z
    .array(
      z.object({
        day: z.number().int().min(0).max(6),   // 0=Sun … 6=Sat
        open: z.string().regex(/^\d{2}:\d{2}$/),
        close: z.string().regex(/^\d{2}:\d{2}$/),
        closed: z.boolean().optional(),
      })
    )
    .optional()
    .nullable(),
});

export const ZApproveVendorSchema = z.object({
  vendorUserId: z.number().int(),
  isApproved: z.boolean(),
});

export type TUpsertVendorProfileSchema = z.infer<typeof ZUpsertVendorProfileSchema>;
export type TApproveVendorSchema = z.infer<typeof ZApproveVendorSchema>;
