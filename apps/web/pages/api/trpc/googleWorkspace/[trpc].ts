import { createNextApiHandler } from "@kalo/trpc/server/createNextApiHandler";
import { googleWorkspaceRouter } from "@kalo/trpc/server/routers/viewer/googleWorkspace/_router";

export default createNextApiHandler(googleWorkspaceRouter);
