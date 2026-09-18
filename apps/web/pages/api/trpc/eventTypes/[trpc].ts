import { createNextApiHandler } from "@kalo/trpc/server/createNextApiHandler";
import { eventTypesRouter } from "@kalo/trpc/server/routers/viewer/eventTypes/_router";

export default createNextApiHandler(eventTypesRouter);
