import { createNextApiHandler } from "@kalo/trpc/server/createNextApiHandler";
import { holidaysRouter } from "@kalo/trpc/server/routers/viewer/holidays/_router";

export default createNextApiHandler(holidaysRouter);
