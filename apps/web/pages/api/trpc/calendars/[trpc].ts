import { createNextApiHandler } from "@kalo/trpc/server/createNextApiHandler";
import { calendarsRouter } from "@kalo/trpc/server/routers/viewer/calendars/_router";

export default createNextApiHandler(calendarsRouter);
