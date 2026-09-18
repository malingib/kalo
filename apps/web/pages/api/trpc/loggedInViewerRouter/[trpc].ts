import { createNextApiHandler } from "@kalo/trpc/server/createNextApiHandler";
import { loggedInViewerRouter } from "@kalo/trpc/server/routers/loggedInViewer/_router";

export default createNextApiHandler(loggedInViewerRouter);
