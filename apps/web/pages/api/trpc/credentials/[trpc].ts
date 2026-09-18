import { createNextApiHandler } from "@kalo/trpc/server/createNextApiHandler";
import { credentialsRouter } from "@kalo/trpc/server/routers/viewer/credentials/_router";

export default createNextApiHandler(credentialsRouter);
