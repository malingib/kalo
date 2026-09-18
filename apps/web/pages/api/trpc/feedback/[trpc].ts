import { createNextApiHandler } from "@kalo/trpc/server/createNextApiHandler";
import { feedbackRouter } from "@kalo/trpc/server/routers/viewer/feedback/_router";

export default createNextApiHandler(feedbackRouter);
