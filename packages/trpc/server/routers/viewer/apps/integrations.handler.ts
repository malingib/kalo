import { getConnectedApps } from "@kalo/app-store/_utils/getConnectedApps";
import { prisma } from "@kalo/prisma";
import type { TrpcSessionUser } from "@kalo/trpc/server/types";

import type { TIntegrationsInputSchema } from "./integrations.schema";

type IntegrationsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TIntegrationsInputSchema;
};

export const integrationsHandler = async ({ ctx, input }: IntegrationsOptions) => {
  const user = ctx.user;
  return getConnectedApps({ user, input, prisma });
};
