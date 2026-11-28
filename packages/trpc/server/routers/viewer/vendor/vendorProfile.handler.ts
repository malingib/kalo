import { TRPCError } from "@trpc/server";

import prisma from "@kalo/prisma";
import { Prisma } from "@kalo/prisma/client";
import { encryptMpesaSecret } from "@kalo/features/mpesa";

import type { TRPCAuthedContext } from "../../../procedures/authedProcedure";
import type { TApproveVendorSchema, TUpsertVendorProfileSchema } from "./vendorProfile.schema";

type Ctx = { ctx: TRPCAuthedContext };
type UpsertOpts = { ctx: TRPCAuthedContext; input: TUpsertVendorProfileSchema };
type ApproveOpts = { ctx: TRPCAuthedContext; input: TApproveVendorSchema };
type UpdateMpesaCredentialsOpts = { ctx: TRPCAuthedContext; input: import("./vendorProfile.schema").TUpdateMpesaCredentialsSchema };

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
    ...(input.whatsappEnabled !== undefined && { whatsappEnabled: input.whatsappEnabled }),
    ...(input.whatsappGreeting !== undefined && { whatsappGreeting: input.whatsappGreeting }),
    ...(input.whatsappFaqJson !== undefined && {
      whatsappFaqJson: input.whatsappFaqJson === null ? Prisma.DbNull : input.whatsappFaqJson,
    }),
    ...(input.whatsappOfflineMessage !== undefined && { whatsappOfflineMessage: input.whatsappOfflineMessage }),
    ...(input.whatsappAutoConfirm !== undefined && { whatsappAutoConfirm: input.whatsappAutoConfirm }),
    ...(input.operatingHoursJson !== undefined && {
      operatingHoursJson: input.operatingHoursJson === null ? Prisma.DbNull : input.operatingHoursJson,
    }),
  };

  return prisma.$transaction(async (tx) => {
    const profile = await tx.vendorProfile.upsert({
      where: { userId: ctx.user.id },
      create: { userId: ctx.user.id, ...data },
      update: data,
      select: VENDOR_PROFILE_SELECT,
    });

    // Keep the legacy User-level M-Pesa fields used by the WhatsApp bot and
    // STK routing in sync with the vendor's settlement settings.
    if (input.mpesaTillNumber !== undefined || input.mpesaPaybill !== undefined) {
      await tx.user.update({
        where: { id: ctx.user.id },
        data: {
          ...(input.mpesaTillNumber !== undefined && { mpesaTillNumber: input.mpesaTillNumber }),
          ...(input.mpesaPaybill !== undefined && { mpesaPaybill: input.mpesaPaybill }),
        },
      });
    }

    return profile;
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


/** Return configuration state only; never expose a stored shortcode secret or passkey. */
export const getMpesaCredentialsStatusHandler = async ({ ctx }: Ctx) => {
  const user = await prisma.user.findUnique({
    where: { id: ctx.user.id },
    select: {
      mpesaShortcode: true,
      mpesaShortcodeType: true,
      mpesaTillNumber: true,
      mpesaPasskey: true,
    },
  });
  return {
    shortcode: user?.mpesaShortcode ?? "",
    shortcodeType: user?.mpesaShortcodeType === "BUY_GOODS" ? ("BUY_GOODS" as const) : ("PAYBILL" as const),
    tillNumber: user?.mpesaTillNumber ?? "",
    hasShortcode: Boolean(user?.mpesaShortcode),
    hasPasskey: Boolean(user?.mpesaPasskey),
  };
};

/** Store a vendor's Daraja passkey encrypted at rest. */
export const updateMpesaCredentialsHandler = async ({ ctx, input }: UpdateMpesaCredentialsOpts) => {
  const current = await prisma.user.findUnique({
    where: { id: ctx.user.id },
    select: { mpesaPasskey: true, mpesaTillNumber: true },
  });
  if (!input.passkey && !current?.mpesaPasskey) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Enter your Daraja passkey to complete M-Pesa setup",
    });
  }
  if (input.shortcodeType === "BUY_GOODS" && !input.tillNumber && !current?.mpesaTillNumber) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Enter the Buy Goods Till number used as the STK receiver",
    });
  }

  const data = {
    mpesaShortcode: input.shortcode,
    mpesaShortcodeType: input.shortcodeType,
    ...(input.tillNumber ? { mpesaTillNumber: input.tillNumber } : {}),
    ...(input.passkey ? { mpesaPasskey: encryptMpesaSecret(input.passkey) } : {}),
  };
  await prisma.user.update({ where: { id: ctx.user.id }, data });
  return { saved: true, hasShortcode: true, hasPasskey: true };
};
