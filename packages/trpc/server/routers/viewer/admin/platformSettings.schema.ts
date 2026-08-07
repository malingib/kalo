import { z } from "zod";

export const ZGetPlatformSettingsSchema = z.object({});

export const ZUpdatePlatformSettingsSchema = z.object({
  platformFeePercent: z.number().min(0).max(100).optional(),
  platformFeeCurrency: z.string().max(3).optional(),
  subscriptionPlans: z
    .array(
      z.object({
        slug: z.string(),
        label: z.string(),
        maxServices: z.number().int(),
        feePercent: z.number().min(0).max(100),
      })
    )
    .optional(),
  // Master Daraja credentials
  darajaConsumerKey: z.string().optional().nullable(),
  darajaConsumerSecret: z.string().optional().nullable(),
  darajaShortcode: z.string().optional().nullable(),
  darajaPasskey: z.string().optional().nullable(),
  darajaCallbackUrl: z.string().url().optional().nullable(),
  darajaIsSandbox: z.boolean().optional(),
  // Central WhatsApp Gateway
  centralWhatsappPhone: z.string().optional().nullable(),
  centralWhatsappEnabled: z.boolean().optional(),
  // Vendor onboarding
  requireVendorApproval: z.boolean().optional(),
});

export type TUpdatePlatformSettingsSchema = z.infer<typeof ZUpdatePlatformSettingsSchema>;
