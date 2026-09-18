import { createNextApiHandler } from "@kalo/trpc/server/createNextApiHandler";
import { appsRouter } from "@kalo/trpc/server/routers/viewer/apps/_router";

export default createNextApiHandler(appsRouter);
