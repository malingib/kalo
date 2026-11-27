import { startWorkspaceSubscription } from "@kalo/features/mpesa/subscriptionService";
import { getServerSession } from "@kalo/features/auth/lib/getServerSession";
import prisma from "@kalo/prisma";
import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

const inputSchema = z.object({
  teamId: z.number().int().positive(),
  subscriptionType: z.enum(["TEAM", "ORGANIZATION"]),
  planName: z.string().trim().min(1).max(80),
  billingPeriod: z.enum(["MONTHLY", "ANNUALLY"]),
  phoneNumber: z.string().trim().min(8).max(20),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  const session = await getServerSession({ req });
  const userId = session?.user?.id;
  if (!userId) return res.status(401).json({ message: "Not authenticated" });

  const parsed = inputSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid workspace subscription request" });

  const { teamId, subscriptionType, planName, billingPeriod, phoneNumber } = parsed.data;
  const [team, membership] = await Promise.all([
    prisma.team.findUnique({
      where: { id: teamId },
      select: { id: true, isOrganization: true },
    }),
    prisma.membership.findFirst({
      where: {
        teamId,
        userId,
        accepted: true,
        role: { in: ["OWNER", "ADMIN"] },
      },
      select: { id: true },
    }),
  ]);

  if (!team) return res.status(404).json({ message: "Workspace not found" });
  if (!membership) return res.status(403).json({ message: "Workspace administrator access is required" });
  if ((subscriptionType === "ORGANIZATION") !== team.isOrganization) {
    return res.status(400).json({ message: "Subscription type does not match the selected workspace" });
  }

  try {
    const result = await startWorkspaceSubscription({
      teamId,
      subscriptionType,
      planName,
      billingPeriod,
      phoneNumber,
    });
    return res.status(202).json({
      ...result,
      message: "M-Pesa payment prompt sent. Enter your PIN to authorize the subscription.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Workspace subscription could not be started";
    const status = message.includes("already exists") ? 409 : message.includes("not configured") ? 503 : 400;
    return res.status(status).json({
      message:
        status === 503
          ? "The requested subscription plan or M-Pesa billing configuration is not available."
          : message,
    });
  }
}
