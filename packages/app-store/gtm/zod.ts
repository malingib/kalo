import { z } from "zod";

import { eventTypeAppCardZod } from "@kalo/app-store/eventTypeAppCardZod";

export const appDataSchema = eventTypeAppCardZod.merge(
  z.object({
    trackingId: z.string().transform((val) => {
      let trackingId = val.trim();
      // Ensure that trackingId is transformed if needed to begin with "GTM-" always
      trackingId = !trackingId.startsWith("GTM-") ? `GTM-${trackingId}` : trackingId;
      return trackingId;
    }),
  })
);

export const appKeysSchema = z.object({});
