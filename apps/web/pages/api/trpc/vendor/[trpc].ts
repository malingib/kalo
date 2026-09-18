import { createNextApiHandler } from "@kalo/trpc/server/createNextApiHandler";
import { vendorRouter } from "@kalo/trpc/server/routers/viewer/vendor/_router";

export default createNextApiHandler(vendorRouter);
