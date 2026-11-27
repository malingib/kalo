import { initiateWorkspaceSubscriptionRenewal } from "@kalo/features/mpesa/subscriptionService";
import { getServerSession } from "@kalo/features/auth/lib/getServerSession";
import prisma from "@kalo/prisma";
import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

const inputSchema = z.object({
  teamId: z.number().int().positive(),
  subscriptionId: z.string().uuid(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });
  const session = await getServerSession({ req });
  const userId = session?.user?.id;
  if (!userId) return res.status(401).json({ message: "Not authenticated" });

  const parsed = inputSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid workspace subscription reference" });

  const membership = await prisma.membership.findFirst({
    where: {
      teamId: parsed.data.teamId,
      userId,
      accepted: true,
      role: { in: ["OWNER", "ADMIN"] },
    },
    select: { id: true },
  });
  if (!membership) return res.status(403).json({ message: "Workspace administrator access is required" });

  try {
    const result = await initiateWorkspaceSubscriptionRenewal(parsed.data);
    return res.status(202).json({
      ...result,
      message: "M-Pesa renewal prompt sent. Enter your PIN to authorize payment.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Renewal could not be started";
    return res.status(message.includes("No renewable") ? 404 : 400).json({ message });
  }
}
