import { createNextApiHandler } from "@kalo/trpc/server/createNextApiHandler";
import { oooRouter } from "@kalo/trpc/server/routers/viewer/ooo/_router";

export default createNextApiHandler(oooRouter);
