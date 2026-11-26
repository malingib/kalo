import { startPremiumUsernameSubscription } from "@kalo/features/mpesa/subscriptionService";
import { getServerSession } from "@kalo/features/auth/lib/getServerSession";
import { usernameCheck } from "@kalo/lib/server/username";
import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

const inputSchema = z.object({
  intentUsername: z.string().trim().min(3).max(40).regex(/^[a-zA-Z0-9_]+$/),
  phoneNumber: z.string().trim().min(8).max(20),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  const session = await getServerSession({ req });
  const userId = session?.user?.id;
  if (!userId) return res.status(401).json({ message: "Not authenticated" });

  const parsed = inputSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid subscription request" });

  const { intentUsername, phoneNumber } = parsed.data;
  const availability = await usernameCheck(intentUsername);
  if (!availability.available) return res.status(409).json({ message: "Username is not available" });

  try {
    const result = await startPremiumUsernameSubscription({ userId, username: intentUsername, phoneNumber });
    return res.status(202).json({
      subscriptionId: result.subscriptionId,
      status: result.status,
      message: "M-Pesa prompt sent. Enter your PIN to authorize the subscription payment.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Subscription payment could not be started";
    const status = message.includes("already exists") ? 409 : 400;
    return res.status(status).json({ message });
  }
}
