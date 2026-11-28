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
  // Daraja credentials are server-only environment configuration, not admin API inputs.
  // Central WhatsApp Gateway
  centralWhatsappPhone: z.string().optional().nullable(),
  centralWhatsappEnabled: z.boolean().optional(),
  // Vendor onboarding
  requireVendorApproval: z.boolean().optional(),
});

export type TUpdatePlatformSettingsSchema = z.infer<typeof ZUpdatePlatformSettingsSchema>;
