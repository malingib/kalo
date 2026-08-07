import { z } from "zod";

export const ZListAlertsSchema = z.object({
  unreadOnly: z.boolean().optional().default(false),
  take: z.number().int().min(1).max(100).optional().default(30),
  skip: z.number().int().min(0).optional().default(0),
});

export const ZMarkAlertsReadSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});

export const ZDismissAlertSchema = z.object({
  id: z.string().uuid(),
});

const ALERT_TYPES = [
  "LOW_STOCK",
  "NEW_BOOKING",
  "PAYMENT_RECEIVED",
  "BOOKING_CANCELLED",
  "BOOKING_REMINDER",
  "DEPOSIT_OVERDUE",
  "VENDOR_APPROVAL_NEEDED",
  "PLATFORM_ANNOUNCEMENT",
] as const;

const ALERT_CHANNELS = ["IN_APP", "WHATSAPP", "EMAIL", "SMS"] as const;

export const ZUpdateAlertPreferencesSchema = z.object({
  // e.g. { LOW_STOCK: ["IN_APP","WHATSAPP"], NEW_BOOKING: ["IN_APP","WHATSAPP","EMAIL"] }
  prefs: z.record(
    z.enum(ALERT_TYPES),
    z.array(z.enum(ALERT_CHANNELS))
  ),
});

export type TUpdateAlertPreferencesSchema = z.infer<typeof ZUpdateAlertPreferencesSchema>;
