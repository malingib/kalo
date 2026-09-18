import { createNextApiHandler } from "@kalo/trpc/server/createNextApiHandler";
import { slotsRouter } from "@kalo/trpc/server/routers/viewer/slots/_router";

export default createNextApiHandler(slotsRouter);
