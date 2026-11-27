import {
  initiatePremiumSubscriptionRenewal,
  initiateWorkspaceSubscriptionRenewal,
} from "@kalo/features/mpesa/subscriptionService";
import prisma from "@kalo/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const staleBefore = new Date(Date.now() - 30 * 60 * 1000);
  const staleSubscriptions = await prisma.mPesaSubscription.findMany({
    where: {
      status: { in: ["PENDING", "PAYMENT_PENDING", "RENEWAL_INITIATING"] },
      updatedAt: { lte: staleBefore },
    },
    select: { id: true, userId: true, teamId: true, subscriptionType: true },
    take: 50,
    orderBy: { updatedAt: "asc" },
  });

  // No callback is not proof of a failed payment. Do not unlock another STK
  // prompt after a timeout: the first prompt may have been paid and its callback
  // lost. Require reconciliation before another charge can be requested.
  await Promise.all(
    staleSubscriptions.map(async (subscription) => {
      const recipients = subscription.userId
        ? [subscription.userId]
        : subscription.teamId
          ? (
              await prisma.membership.findMany({
                where: {
                  teamId: subscription.teamId,
                  accepted: true,
                  role: { in: ["OWNER", "ADMIN"] },
                },
                select: { userId: true },
              })
            ).map((membership) => membership.userId)
          : [];

      await prisma.$transaction(async (tx) => {
        const claimed = await tx.mPesaSubscription.updateMany({
          where: {
            id: subscription.id,
            status: { in: ["PENDING", "PAYMENT_PENDING", "RENEWAL_INITIATING"] },
            updatedAt: { lte: staleBefore },
          },
          data: { status: "RECONCILIATION_REQUIRED" },
        });
        if (claimed.count !== 1) return;

        await tx.mPesaTransaction.updateMany({
          where: {
            subscriptionId: subscription.id,
            status: { in: ["INITIATING", "PENDING"] },
          },
          data: {
            status: "RECONCILIATION_REQUIRED",
            resultDesc: "No Daraja callback was received; verify the transaction before requesting another payment",
          },
        });

        if (recipients.length) {
          await tx.alert.createMany({
            data: recipients.map((userId) => ({
              userId,
              type: "PAYMENT_RECONCILIATION_REQUIRED",
              channel: "IN_APP",
              title: "M-Pesa subscription needs verification",
              body: "No Daraja callback was received. Check the M-Pesa statement before requesting another payment.",
              metadata: {
                subscriptionId: subscription.id,
                subscriptionType: subscription.subscriptionType,
              },
            })),
          });
        }
      });
    })
  );

  const staleBookingTransactions = await prisma.mPesaTransaction.findMany({
    where: {
      source: "booking-payment",
      status: { in: ["INITIATING", "PENDING"] },
      createdAt: { lte: staleBefore },
    },
    select: {
      id: true,
      paymentId: true,
      booking: { select: { uid: true, userId: true } },
    },
    take: 100,
    orderBy: { createdAt: "asc" },
  });

  await Promise.all(
    staleBookingTransactions.map(async (transaction) => {
      await prisma.$transaction(async (tx) => {
        const claimed = await tx.mPesaTransaction.updateMany({
          where: { id: transaction.id, status: { in: ["INITIATING", "PENDING"] } },
          data: {
            status: "RECONCILIATION_REQUIRED",
            resultDesc: "No verified Daraja callback was received; verify the payment before confirming the booking",
          },
        });
        if (claimed.count !== 1) return;

        if (transaction.booking?.userId) {
          await tx.alert.create({
            data: {
              userId: transaction.booking.userId,
              type: "PAYMENT_RECONCILIATION_REQUIRED",
              channel: "IN_APP",
              title: "M-Pesa booking payment needs verification",
              body: "No verified Daraja callback was received. Check the M-Pesa statement before confirming the booking or requesting another payment.",
              metadata: {
                bookingUid: transaction.booking.uid,
                transactionId: transaction.id,
                paymentId: transaction.paymentId,
              },
            },
          });
        }
      });
    })
  );

  const due = await prisma.mPesaSubscription.findMany({
    where: {
      subscriptionType: { in: ["PREMIUM_USERNAME", "TEAM", "ORGANIZATION"] },
      status: "ACTIVE",
      nextBillingAt: { lte: new Date() },
    },
    select: { id: true, userId: true, teamId: true, subscriptionType: true },
    take: 50,
    orderBy: { nextBillingAt: "asc" },
  });

  const results = await Promise.all(
    due.map(async (subscription) => {
      try {
        if (subscription.subscriptionType === "PREMIUM_USERNAME") {
          if (!subscription.userId) return { id: subscription.id, status: "SKIPPED" };
          await initiatePremiumSubscriptionRenewal({
            subscriptionId: subscription.id,
            userId: subscription.userId,
          });
        } else {
          if (!subscription.teamId) return { id: subscription.id, status: "SKIPPED" };
          await initiateWorkspaceSubscriptionRenewal({
            subscriptionId: subscription.id,
            teamId: subscription.teamId,
          });
        }
        return { id: subscription.id, status: "PROMPT_SENT" };
      } catch {
        return { id: subscription.id, status: "FAILED" };
      }
    })
  );

  return NextResponse.json({
    processed: results.length,
    promptSent: results.filter((item) => item.status === "PROMPT_SENT").length,
    failed: results.filter((item) => item.status === "FAILED").length,
    skipped: results.filter((item) => item.status === "SKIPPED").length,
  });
}
