import { prisma } from "@kalo/prisma";
import { userMetadata } from "@kalo/prisma/zod-utils";
import type { TrpcSessionUser } from "@kalo/trpc/server/types";
import { TRPCError } from "@trpc/server";

type Options = { ctx: { user: NonNullable<TrpcSessionUser> } };

export const mpesaSubscriptionHandler = async ({ ctx }: Options) => {
  const user = await prisma.user.findUnique({
    where: { id: ctx.user.id },
    select: { metadata: true },
  });
  if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "User not found" });

  const subscription = await prisma.mPesaSubscription.findFirst({
    where: { userId: ctx.user.id, subscriptionType: "PREMIUM_USERNAME" },
    orderBy: { createdAt: "desc" },
    select: { id: true, username: true, status: true, currentPeriodEnd: true, phoneNumber: true },
  });
  const metadata = userMetadata.parse(user.metadata);
  return {
    isPremium: !!metadata?.isPremium,
    id: subscription?.id ?? null,
    username: subscription?.username ?? null,
    status: subscription?.status ?? null,
    currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
    phoneNumber: subscription?.phoneNumber ?? null,
  };
};
