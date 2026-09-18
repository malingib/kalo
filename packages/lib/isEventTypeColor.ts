import type { z } from "zod";

import { eventTypeColor as eventTypeColorSchema } from "@kalo/prisma/zod-utils";

type EventTypeColor = z.infer<typeof eventTypeColorSchema>;
export function isEventTypeColor(obj: unknown): obj is EventTypeColor {
  return eventTypeColorSchema.safeParse(obj).success;
}

export function parseEventTypeColor(obj: unknown): EventTypeColor {
  let eventTypeColor: EventTypeColor = null;
  if (isEventTypeColor(obj)) eventTypeColor = obj;

  return eventTypeColor;
}
