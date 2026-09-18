import { createNextApiHandler } from "@kalo/trpc/server/createNextApiHandler";
import { meRouter } from "@kalo/trpc/server/routers/viewer/me/_router";

export default createNextApiHandler(meRouter);
