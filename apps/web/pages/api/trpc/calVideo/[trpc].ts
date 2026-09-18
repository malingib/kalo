import { createNextApiHandler } from "@kalo/trpc/server/createNextApiHandler";
import { calVideoRouter } from "@kalo/trpc/server/routers/viewer/calVideo/_router";

export default createNextApiHandler(calVideoRouter);
