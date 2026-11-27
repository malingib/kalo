import prisma from "@kalo/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ message: "Method Not Allowed" });
  const bookingUid = typeof req.query.bookingUid === "string" ? req.query.bookingUid : "";
  if (!bookingUid || bookingUid.length > 128) return res.status(400).json({ message: "Invalid booking reference" });

  const booking = await prisma.booking.findUnique({
    where: { uid: bookingUid },
    select: {
      payment: {
        where: { appId: "mpesa" },
        orderBy: { id: "desc" },
        take: 1,
        select: {
          success: true,
          data: true,
          mpesaTransaction: { select: { status: true } },
        },
      },
    },
  });
  if (!booking) return res.status(404).json({ message: "Booking not found" });

  const payment = booking.payment[0];
  const data =
    payment?.data && typeof payment.data === "object" && !Array.isArray(payment.data)
      ? (payment.data as Record<string, unknown>)
      : {};
  const transactionStatus = payment?.mpesaTransaction?.status;
  const rawStatus = typeof data.status === "string" ? data.status : null;

  const status = payment?.success
    ? "SUCCESS"
    : transactionStatus === "RECONCILIATION_REQUIRED" || rawStatus === "RECONCILIATION_REQUIRED"
      ? "RECONCILIATION_REQUIRED"
      : transactionStatus === "FAILED" || rawStatus === "FAILED"
        ? "FAILED"
        : "PENDING";

  return res.status(200).json({ status });
}
