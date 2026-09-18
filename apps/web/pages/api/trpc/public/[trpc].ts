import { createNextApiHandler } from "@kalo/trpc/server/createNextApiHandler";
import { publicViewerRouter } from "@kalo/trpc/server/routers/publicViewer/_router";

export default createNextApiHandler(publicViewerRouter, true);
