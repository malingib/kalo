import { z } from "zod";

import { eventTypeAppCardZod } from "@kalo/app-store/eventTypeAppCardZod";

export const appDataSchema = eventTypeAppCardZod.merge(
  z.object({
    SITE_ID: z.string().optional(),
  })
);

export const appKeysSchema = z.object({});
