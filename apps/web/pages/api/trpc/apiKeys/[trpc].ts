import { createNextApiHandler } from "@kalo/trpc/server/createNextApiHandler";
import { apiKeysRouter } from "@kalo/trpc/server/routers/viewer/apiKeys/_router";

export default createNextApiHandler(apiKeysRouter);