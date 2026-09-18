import { createNextApiHandler } from "@kalo/trpc/server/createNextApiHandler";
import { deploymentSetupRouter } from "@kalo/trpc/server/routers/viewer/deploymentSetup/_router";

export default createNextApiHandler(deploymentSetupRouter);
