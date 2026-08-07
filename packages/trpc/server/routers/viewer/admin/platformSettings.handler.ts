import prisma from "@calcom/prisma";

import type { TRPCAuthedContext } from "../../../procedures/authedProcedure";
import type { TUpdatePlatformSettingsSchema } from "./platformSettings.schema";

type GetOptions = { ctx: TRPCAuthedContext };
type UpdateOptions = { ctx: TRPCAuthedContext; input: TUpdatePlatformSettingsSchema };

export const getPlatformSettingsHandler = async ({ ctx: _ctx }: GetOptions) => {
  // There is exactly one row; create it with defaults if not yet seeded.
  const existing = await prisma.platformSettings.findFirst({
    select: {
      id: true,
      platformFeePercent: true,
      platformFeeCurrency: true,
      subscriptionPlans: true,
      darajaConsumerKey: true,
      darajaConsumerSecret: true,
      darajaShortcode: true,
      darajaIsSandbox: true,
      darajaCallbackUrl: true,
      centralWhatsappPhone: true,
      centralWhatsappEnabled: true,
      requireVendorApproval: true,
      updatedAt: true,
    },
  });

  if (existing) return existing;

  // Seed defaults on first access
  return prisma.platformSettings.create({
    data: {},
    select: {
      id: true,
      platformFeePercent: true,
      platformFeeCurrency: true,
      subscriptionPlans: true,
      darajaConsumerKey: true,
      darajaConsumerSecret: true,
      darajaShortcode: true,
      darajaIsSandbox: true,
      darajaCallbackUrl: true,
      centralWhatsappPhone: true,
      centralWhatsappEnabled: true,
      requireVendorApproval: true,
      updatedAt: true,
    },
  });
};

export const updatePlatformSettingsHandler = async ({ ctx: _ctx, input }: UpdateOptions) => {
  const existing = await prisma.platformSettings.findFirst({ select: { id: true } });

  const data = {
    ...(input.platformFeePercent !== undefined && { platformFeePercent: input.platformFeePercent }),
    ...(input.platformFeeCurrency !== undefined && { platformFeeCurrency: input.platformFeeCurrency }),
    ...(input.subscriptionPlans !== undefined && { subscriptionPlans: input.subscriptionPlans }),
    ...(input.darajaConsumerKey !== undefined && { darajaConsumerKey: input.darajaConsumerKey }),
    ...(input.darajaConsumerSecret !== undefined && { darajaConsumerSecret: input.darajaConsumerSecret }),
    ...(input.darajaShortcode !== undefined && { darajaShortcode: input.darajaShortcode }),
    ...(input.darajaPasskey !== undefined && { darajaPasskey: input.darajaPasskey }),
    ...(input.darajaCallbackUrl !== undefined && { darajaCallbackUrl: input.darajaCallbackUrl }),
    ...(input.darajaIsSandbox !== undefined && { darajaIsSandbox: input.darajaIsSandbox }),
    ...(input.centralWhatsappPhone !== undefined && { centralWhatsappPhone: input.centralWhatsappPhone }),
    ...(input.centralWhatsappEnabled !== undefined && { centralWhatsappEnabled: input.centralWhatsappEnabled }),
    ...(input.requireVendorApproval !== undefined && { requireVendorApproval: input.requireVendorApproval }),
  };

  if (existing) {
    return prisma.platformSettings.update({ where: { id: existing.id }, data });
  }
  return prisma.platformSettings.create({ data });
};
