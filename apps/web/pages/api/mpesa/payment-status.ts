import prisma from "@kalo/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ message: "Method Not Allowed" });
  const bookingUid = typeof req.query.bookingUid === "string" ? req.query.bookingUid : "";
  if (!bookingUid || bookingUid.length > 128) return res.status(400).json({ message: "Invalid booking reference" });

  const booking = await prisma.booking.findUnique({
    where: { uid: bookingUid },
    select: {
      paid: true,
      payment: {
        where: { appId: "mpesa" },
        orderBy: { id: "desc" },
        take: 1,
        select: { success: true, data: true },
      },
    },
  });
  if (!booking) return res.status(404).json({ message: "Booking not found" });
  const payment = booking.payment[0];
  const data = payment?.data && typeof payment.data === "object" ? payment.data as Record<string, unknown> : {};
  const status = payment?.success ? "SUCCESS" : data.status === "FAILED" ? "FAILED" : "PENDING";
  return res.status(200).json({ status });
}
