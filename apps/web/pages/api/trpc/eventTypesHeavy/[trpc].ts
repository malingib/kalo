import { createNextApiHandler } from "@kalo/trpc/server/createNextApiHandler";
import { eventTypesRouter } from "@kalo/trpc/server/routers/viewer/eventTypes/heavy/_router";

export default createNextApiHandler(eventTypesRouter);
