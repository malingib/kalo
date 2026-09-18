import { createNextApiHandler } from "@kalo/trpc/server/createNextApiHandler";
import { webhookRouter } from "@kalo/trpc/server/routers/viewer/webhook/_router";

export default createNextApiHandler(webhookRouter);
