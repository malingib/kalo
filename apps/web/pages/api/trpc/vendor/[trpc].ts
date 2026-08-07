import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { vendorRouter } from "@calcom/trpc/server/routers/viewer/vendor/_router";

export default createNextApiHandler(vendorRouter);
