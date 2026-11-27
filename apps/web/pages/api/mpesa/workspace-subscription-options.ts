import { listWorkspaceSubscriptionPlans } from "@kalo/features/mpesa/subscriptionService";
import { getServerSession } from "@kalo/features/auth/lib/getServerSession";
import prisma from "@kalo/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ message: "Method not allowed" });
  const session = await getServerSession({ req });
  const userId = session?.user?.id;
  if (!userId) return res.status(401).json({ message: "Not authenticated" });

  const memberships = await prisma.membership.findMany({
    where: {
      userId,
      accepted: true,
      role: { in: ["OWNER", "ADMIN"] },
    },
    select: {
      team: { select: { id: true, name: true, isOrganization: true } },
    },
  });

  const workspaces = memberships.map(({ team }) => team);
  const subscriptions = workspaces.length
    ? await prisma.mPesaSubscription.findMany({
        where: {
          teamId: { in: workspaces.map((team) => team.id) },
          subscriptionType: { in: ["TEAM", "ORGANIZATION"] },
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          teamId: true,
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
      })
    : [];

  const latestByTeam = new Map<number, (typeof subscriptions)[number]>();
  for (const subscription of subscriptions) {
    if (subscription.teamId && !latestByTeam.has(subscription.teamId)) {
      latestByTeam.set(subscription.teamId, subscription);
    }
  }

  return res.status(200).json({
    workspaces: workspaces.map((team) => {
      const subscriptionType = team.isOrganization ? "ORGANIZATION" : "TEAM";
      let plans: ReturnType<typeof listWorkspaceSubscriptionPlans> = [];
      let configurationAvailable = true;
      try {
        plans = listWorkspaceSubscriptionPlans(subscriptionType);
      } catch {
        configurationAvailable = false;
      }
      const subscription = latestByTeam.get(team.id);
      return {
        ...team,
        subscriptionType,
        plans,
        configurationAvailable,
        subscription: subscription
          ? {
              ...subscription,
              phoneNumber: `••••${subscription.phoneNumber.slice(-4)}`,
            }
          : null,
      };
    }),
  });
}
