import { initiatePremiumSubscriptionRenewal } from "@kalo/features/mpesa/subscriptionService";
import { getServerSession } from "@kalo/features/auth/lib/getServerSession";
import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

const inputSchema = z.object({ subscriptionId: z.string().uuid() });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });
  const session = await getServerSession({ req });
  const userId = session?.user?.id;
  if (!userId) return res.status(401).json({ message: "Not authenticated" });
  const parsed = inputSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid subscription reference" });

  try {
    const result = await initiatePremiumSubscriptionRenewal({
      subscriptionId: parsed.data.subscriptionId,
      userId,
    });
    return res.status(202).json({
      ...result,
      message: result.status === "RECONCILIATION_REQUIRED"
        ? "Safaricom accepted the renewal prompt, but the local transaction needs reconciliation. Do not retry the payment."
        : "M-Pesa renewal prompt sent. Enter your PIN to authorize payment.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Renewal could not be started";
    return res.status(message.includes("No renewable") ? 404 : 400).json({ message });
  }
}
