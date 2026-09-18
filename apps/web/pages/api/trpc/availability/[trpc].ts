import { createNextApiHandler } from "@kalo/trpc/server/createNextApiHandler";
import { availabilityRouter } from "@kalo/trpc/server/routers/viewer/availability/_router";

export default createNextApiHandler(availabilityRouter);
