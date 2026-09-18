import EventManager from "@kalo/features/bookings/lib/EventManager";

export { getPublicEvent, type PublicEventType } from "@kalo/features/eventtypes/lib/getPublicEvent";

export { getBulkUserEventTypes, getBulkTeamEventTypes } from "@kalo/app-store/_utils/getBulkEventTypes";

export { createHandler as createEventType } from "@kalo/trpc/server/routers/viewer/eventTypes/heavy/create.handler";
export { updateHandler as updateEventType } from "@kalo/trpc/server/routers/viewer/eventTypes/heavy/update.handler";

export { listWithTeamHandler } from "@kalo/trpc/server/routers/viewer/eventTypes/listWithTeam.handler";

export type { TUpdateInputSchema as TUpdateEventTypeInputSchema } from "@kalo/trpc/server/routers/viewer/eventTypes/heavy/update.schema";
export type { EventTypesPublic } from "@kalo/features/eventtypes/lib/getEventTypesPublic";
export { getEventTypesPublic } from "@kalo/features/eventtypes/lib/getEventTypesPublic";
export { parseEventTypeColor } from "@kalo/lib/isEventTypeColor";

export {
  EventTypeMetaDataSchema,
  eventTypeBookingFields,
  eventTypeLocations,
} from "@kalo/prisma/zod-utils";

export type { EventTypeMetadata } from "@kalo/prisma/zod-utils";

export { validateCustomEventName } from "@kalo/features/eventtypes/lib/eventNaming";
export { EventManager };
export { getEventTypeById } from "@kalo/features/eventtypes/lib/getEventTypeById";
export { getEventTypesByViewer } from "@kalo/features/eventtypes/lib/getEventTypesByViewer";
export type { EventType } from "@kalo/features/eventtypes/lib/getEventTypeById";
export type { EventTypesByViewer } from "@kalo/features/eventtypes/lib/getEventTypesByViewer";
export type { UpdateEventTypeReturn } from "@kalo/trpc/server/routers/viewer/eventTypes/heavy/update.handler";
export { bulkUpdateEventsToDefaultLocation } from "@kalo/app-store/_utils/bulkUpdateEventsToDefaultLocation";
export { bulkUpdateTeamEventsToDefaultLocation } from "@kalo/app-store/_utils/bulkUpdateTeamEventsToDefaultLocation";
