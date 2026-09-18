import { createNextApiHandler } from "@kalo/trpc/server/createNextApiHandler";
import { userAdminRouter } from "@kalo/trpc/server/routers/viewer/users/_router";

export default createNextApiHandler(userAdminRouter);
