import { getEventTypesByViewer } from "@kalo/features/eventtypes/lib/getEventTypesByViewer";
import { checkRateLimitAndThrowError } from "@kalo/lib/checkRateLimitAndThrowError";
import type { PrismaClient } from "@kalo/prisma";

import type { TrpcSessionUser } from "../../../types";
import type { TEventTypeInputSchema } from "./getByViewer.schema";

type GetByViewerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TEventTypeInputSchema;
};

export const getByViewerHandler = async ({ ctx, input }: GetByViewerOptions) => {
  await checkRateLimitAndThrowError({
    identifier: `eventTypes:getByViewer:${ctx.user.id}`,
    rateLimitingType: "common",
  });
  const user = ctx.user;
  const filters = input?.filters;

  return await getEventTypesByViewer(user, filters);
};
