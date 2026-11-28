import { getServerSession } from "@kalo/features/auth/lib/getServerSession";
import prisma from "@kalo/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ message: "Method not allowed" });
  const session = await getServerSession({ req });
  const userId = session?.user?.id;
  if (!userId) return res.status(401).json({ message: "Not authenticated" });

  const subscription = await prisma.mPesaSubscription.findFirst({
    where: { userId, subscriptionType: "PREMIUM_USERNAME" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      username: true,
      planName: true,
      amountKes: true,
      phoneNumber: true,
      status: true,
      currentPeriodEnd: true,
      nextBillingAt: true,
      lastPaymentAt: true,
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
