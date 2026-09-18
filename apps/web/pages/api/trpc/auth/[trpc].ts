import { createNextApiHandler } from "@kalo/trpc/server/createNextApiHandler";
import { authRouter } from "@kalo/trpc/server/routers/viewer/auth/_router";

export default createNextApiHandler(authRouter);
