import { getServerSession } from "@kalo/features/auth/lib/getServerSession";
import prisma from "@kalo/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ message: "Method not allowed" });
  const session = await getServerSession({ req });
  const userId = session?.user?.id;
  if (!userId) return res.status(401).json({ message: "Not authenticated" });

  const teamId = Number(req.query.teamId);
  if (!Number.isSafeInteger(teamId) || teamId <= 0) {
    return res.status(400).json({ message: "Invalid workspace reference" });
  }

  const membership = await prisma.membership.findFirst({
    where: { teamId, userId, accepted: true, role: { in: ["OWNER", "ADMIN"] } },
    select: { id: true },
  });
  if (!membership) return res.status(403).json({ message: "Workspace administrator access is required" });

  const subscription = await prisma.mPesaSubscription.findFirst({
    where: { teamId, subscriptionType: { in: ["TEAM", "ORGANIZATION"] } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      subscriptionType: true,
      planName: true,
      amountKes: true,
      billingPeriod: true,
      status: true,
      currentPeriodEnd: true,
      nextBillingAt: true,
      lastPaymentAt: true,
      phoneNumber: true,
    },
  });
  if (!subscription) return res.status(200).json({ subscription: null });

  return res.status(200).json({
    subscription: {
      ...subscription,
      phoneNumber: `••••${subscription.phoneNumber.slice(-4)}`,
    },
  });
}
