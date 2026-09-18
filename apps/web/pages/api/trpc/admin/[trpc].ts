import { createNextApiHandler } from "@kalo/trpc/server/createNextApiHandler";
import { adminRouter } from "@kalo/trpc/server/routers/viewer/admin/_router";

export default createNextApiHandler(adminRouter);
