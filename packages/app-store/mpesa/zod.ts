import { z } from "zod";
import { eventTypeAppCardZod } from "../eventTypeAppCardZod";

export const appDataSchema = eventTypeAppCardZod.extend({
  price: z.number().int().positive().refine((price) => price % 100 === 0, "M-Pesa prices must be whole KES amounts"),
  currency: z.literal("KES").default("KES"),
  paymentOption: z.literal("ON_BOOKING").default("ON_BOOKING"),
  enabled: z.boolean().default(false),
});

export const appKeysSchema = z.object({});
