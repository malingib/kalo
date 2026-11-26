import { z } from "zod";
import { eventTypeAppCardZod } from "../eventTypeAppCardZod";

export const appDataSchema = eventTypeAppCardZod.extend({
  price: z.number().positive(),
  currency: z.literal("KES").default("KES"),
  paymentOption: z.literal("ON_BOOKING").default("ON_BOOKING"),
  enabled: z.boolean().default(false),
});

export const appKeysSchema = z.object({});
