import { createNextApiHandler } from "@kalo/trpc/server/createNextApiHandler";
import { featureFlagRouter } from "@kalo/trpc/server/routers/features/_router";

export default createNextApiHandler(featureFlagRouter, true, "features");
