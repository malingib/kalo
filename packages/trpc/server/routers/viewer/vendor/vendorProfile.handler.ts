import { TRPCError } from "@trpc/server";

import prisma from "@kalo/prisma";

import type { TRPCAuthedContext } from "../../../procedures/authedProcedure";
import type { TApproveVendorSchema, TUpsertVendorProfileSchema } from "./vendorProfile.schema";

type Ctx = { ctx: TRPCAuthedContext };
type UpsertOpts = { ctx: TRPCAuthedContext; input: TUpsertVendorProfileSchema };
type ApproveOpts = { ctx: TRPCAuthedContext; input: TApproveVendorSchema };

const VENDOR_PROFILE_SELECT = {
  id: true,
  userId: true,
  businessName: true,
  businessSlug: true,
  businessBio: true,
  logoUrl: true,
  coverImageUrl: true,
  locationText: true,
  locationLat: true,
  locationLng: true,
  currency: true,
  timezone: true,
  planSlug: true,
  isApproved: true,
  isActive: true,
  // M-Pesa (never expose Daraja secrets in list queries)
  mpesaTillNumber: true,
  mpesaPaybill: true,
  mpesaAccountName: true,
  mpesaPayoutPhone: true,
  // WhatsApp config
  whatsappEnabled: true,
  whatsappGreeting: true,
  whatsappFaqJson: true,
  whatsappOfflineMessage: true,
  whatsappAutoConfirm: true,
  operatingHoursJson: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const getVendorProfileHandler = async ({ ctx }: Ctx) => {
  const profile = await prisma.vendorProfile.findUnique({
    where: { userId: ctx.user.id },
    select: VENDOR_PROFILE_SELECT,
  });

  return profile ?? null;
};

export const upsertVendorProfileHandler = async ({ ctx, input }: UpsertOpts) => {
  const data = {
    ...(input.businessName !== undefined && { businessName: input.businessName }),
    ...(input.businessSlug !== undefined && { businessSlug: input.businessSlug }),
    ...(input.businessBio !== undefined && { businessBio: input.businessBio }),
    ...(input.logoUrl !== undefined && { logoUrl: input.logoUrl }),
    ...(input.coverImageUrl !== undefined && { coverImageUrl: input.coverImageUrl }),
    ...(input.locationText !== undefined && { locationText: input.locationText }),
    ...(input.locationLat !== undefined && { locationLat: input.locationLat }),
    ...(input.locationLng !== undefined && { locationLng: input.locationLng }),
    ...(input.currency !== undefined && { currency: input.currency }),
    ...(input.timezone !== undefined && { timezone: input.timezone }),
    ...(input.mpesaTillNumber !== undefined && { mpesaTillNumber: input.mpesaTillNumber }),
    ...(input.mpesaPaybill !== undefined && { mpesaPaybill: input.mpesaPaybill }),
    ...(input.mpesaAccountName !== undefined && { mpesaAccountName: input.mpesaAccountName }),
    ...(input.mpesaPayoutPhone !== undefined && { mpesaPayoutPhone: input.mpesaPayoutPhone }),
    ...(input.darajaConsumerKey !== undefined && { darajaConsumerKey: input.darajaConsumerKey }),
    ...(input.darajaConsumerSecret !== undefined && { darajaConsumerSecret: input.darajaConsumerSecret }),
    ...(input.darajaShortcode !== undefined && { darajaShortcode: input.darajaShortcode }),
    ...(input.darajaPasskey !== undefined && { darajaPasskey: input.darajaPasskey }),
    ...(input.whatsappEnabled !== undefined && { whatsappEnabled: input.whatsappEnabled }),
    ...(input.whatsappGreeting !== undefined && { whatsappGreeting: input.whatsappGreeting }),
    ...(input.whatsappFaqJson !== undefined && { whatsappFaqJson: input.whatsappFaqJson }),
    ...(input.whatsappOfflineMessage !== undefined && { whatsappOfflineMessage: input.whatsappOfflineMessage }),
    ...(input.whatsappAutoConfirm !== undefined && { whatsappAutoConfirm: input.whatsappAutoConfirm }),
    ...(input.operatingHoursJson !== undefined && { operatingHoursJson: input.operatingHoursJson }),
  };

  return prisma.vendorProfile.upsert({
    where: { userId: ctx.user.id },
    create: { userId: ctx.user.id, ...data },
    update: data,
    select: VENDOR_PROFILE_SELECT,
  });
};

/** Super admin only — approve or suspend a vendor */
export const approveVendorHandler = async ({ ctx, input }: ApproveOpts) => {
  if (ctx.user.role !== "ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only platform admins can approve vendors" });
  }

  const profile = await prisma.vendorProfile.findUnique({
    where: { userId: input.vendorUserId },
    select: { id: true },
  });

  if (!profile) {
    throw new TRPCError({ code: "NOT_FOUND", message: `Vendor profile for user ${input.vendorUserId} not found` });
  }

  return prisma.vendorProfile.update({
    where: { userId: input.vendorUserId },
    data: { isApproved: input.isApproved },
    select: { userId: true, businessName: true, isApproved: true },
  });
};

/** Super admin only — list all vendor profiles (paginated) */
export const listVendorsHandler = async ({ ctx }: Ctx) => {
  if (ctx.user.role !== "ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only platform admins can list all vendors" });
  }

  return prisma.vendorProfile.findMany({
    select: {
      id: true,
      userId: true,
      businessName: true,
      businessSlug: true,
      planSlug: true,
      isApproved: true,
      isActive: true,
      createdAt: true,
      user: { select: { email: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
};
