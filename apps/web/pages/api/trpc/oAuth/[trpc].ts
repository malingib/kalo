import { createNextApiHandler } from "@kalo/trpc/server/createNextApiHandler";
import { oAuthRouter } from "@kalo/trpc/server/routers/viewer/oAuth/_router";

export default createNextApiHandler(oAuthRouter);
