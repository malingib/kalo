import { initiatePremiumSubscriptionRenewal } from "@kalo/features/mpesa/subscriptionService";
import prisma from "@kalo/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const staleBefore = new Date(Date.now() - 30 * 60 * 1000);
  await prisma.mPesaSubscription.updateMany({
    where: { status: "PAYMENT_PENDING", updatedAt: { lte: staleBefore } },
    data: { status: "PAST_DUE" },
  });

  const due = await prisma.mPesaSubscription.findMany({
    where: {
      subscriptionType: "PREMIUM_USERNAME",
      status: "ACTIVE",
      nextBillingAt: { lte: new Date() },
    },
    select: { id: true, userId: true },
    take: 50,
    orderBy: { nextBillingAt: "asc" },
  });

  const results = await Promise.all(
    due.map(async (subscription) => {
      if (!subscription.userId) return { id: subscription.id, status: "SKIPPED" };
      try {
        await initiatePremiumSubscriptionRenewal({
          subscriptionId: subscription.id,
          userId: subscription.userId,
        });
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
  });
}
