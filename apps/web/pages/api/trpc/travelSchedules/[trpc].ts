import { createNextApiHandler } from "@kalo/trpc/server/createNextApiHandler";
import { travelSchedulesRouter } from "@kalo/trpc/server/routers/viewer/travelSchedules/_router";

export default createNextApiHandler(travelSchedulesRouter);
