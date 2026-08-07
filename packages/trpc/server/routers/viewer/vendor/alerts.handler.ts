import prisma from "@calcom/prisma";
import type { TRPCAuthedContext } from "../../../procedures/authedProcedure";
import type { TUpdateAlertPreferencesSchema } from "./alerts.schema";

type Ctx = { ctx: TRPCAuthedContext };

const ALERT_SELECT = {
  id: true,
  type: true,
  channel: true,
  title: true,
  body: true,
  isRead: true,
  isDismissed: true,
  metadata: true,
  createdAt: true,
} as const;

export const listAlertsHandler = async ({
  ctx,
  input,
}: {
  ctx: TRPCAuthedContext;
  input: { unreadOnly: boolean; take: number; skip: number };
}) => {
  const [items, unreadCount] = await prisma.$transaction([
    prisma.alert.findMany({
      where: {
        userId: ctx.user.id,
        isDismissed: false,
        ...(input.unreadOnly ? { isRead: false } : {}),
      },
      select: ALERT_SELECT,
      orderBy: { createdAt: "desc" },
      take: input.take,
      skip: input.skip,
    }),
    prisma.alert.count({
      where: { userId: ctx.user.id, isRead: false, isDismissed: false },
    }),
  ]);

  return { items, unreadCount };
};

export const getUnreadAlertsCountHandler = async ({ ctx }: Ctx) => {
  const count = await prisma.alert.count({
    where: { userId: ctx.user.id, isRead: false, isDismissed: false },
  });
  return { count };
};

export const markAlertsReadHandler = async ({
  ctx,
  input,
}: {
  ctx: TRPCAuthedContext;
  input: { ids: string[] };
}) => {
  await prisma.alert.updateMany({
    where: { id: { in: input.ids }, userId: ctx.user.id },
    data: { isRead: true },
  });
  return { success: true, updated: input.ids.length };
};

export const dismissAlertHandler = async ({
  ctx,
  input,
}: {
  ctx: TRPCAuthedContext;
  input: { id: string };
}) => {
  await prisma.alert.updateMany({
    where: { id: input.id, userId: ctx.user.id },
    data: { isDismissed: true },
  });
  return { success: true };
};

export const getAlertPreferencesHandler = async ({ ctx }: Ctx) => {
  const prefs = await prisma.alertPreference.findUnique({
    where: { userId: ctx.user.id },
    select: { prefsJson: true },
  });

  // Return defaults if not configured yet
  if (!prefs) {
    return {
      prefs: {
        LOW_STOCK: ["IN_APP", "WHATSAPP"],
        NEW_BOOKING: ["IN_APP", "WHATSAPP"],
        PAYMENT_RECEIVED: ["IN_APP", "WHATSAPP"],
        BOOKING_CANCELLED: ["IN_APP", "WHATSAPP"],
        BOOKING_REMINDER: ["IN_APP"],
        DEPOSIT_OVERDUE: ["IN_APP", "WHATSAPP"],
        VENDOR_APPROVAL_NEEDED: ["IN_APP"],
        PLATFORM_ANNOUNCEMENT: ["IN_APP"],
      },
    };
  }

  return { prefs: prefs.prefsJson };
};

export const updateAlertPreferencesHandler = async ({
  ctx,
  input,
}: {
  ctx: TRPCAuthedContext;
  input: TUpdateAlertPreferencesSchema;
}) => {
  return prisma.alertPreference.upsert({
    where: { userId: ctx.user.id },
    create: { userId: ctx.user.id, prefsJson: input.prefs },
    update: { prefsJson: input.prefs },
    select: { prefsJson: true },
  });
};
