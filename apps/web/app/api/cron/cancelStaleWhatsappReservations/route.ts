import process from "node:process";
import prisma from "@kalo/prisma";
import { BookingStatus } from "@kalo/prisma/enums";
import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Cron: cancels WhatsApp-bot reservations that were never paid within the TTL
 * and raises a BOOKING_CANCELLED in-app alert for the vendor so abandoned
 * reservations surface in their dashboard.
 *
 * When an STK push is sent, the webhook service creates a PENDING reservation
 * and links the transaction. If the customer abandons the payment and Daraja's
 * failure callback never arrives, that reservation would sit PENDING forever —
 * this job cancels it. Bookings created by the bot are tagged with
 * metadata.whatsappBooking so Cal's own PENDING bookings (host confirmation,
 * etc.) are never touched.
 *
 * Idempotent: the per-booking status guard in each updateMany means only the
 * run that actually transitions PENDING -> CANCELLED raises the alert, so
 * repeated runs (and overlapping runs) cancel and alert each booking exactly
 * once.
 *
 * Auth: protected by CRON_API_KEY, matching the other cron routes.
 */
async function postHandler(request: NextRequest) {
  const apiKey = request.headers.get("authorization") || request.nextUrl.searchParams.get("apiKey");

  if (process.env.CRON_API_KEY !== apiKey) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  const configuredTtl = Number(process.env.WHATSAPP_RESERVATION_TTL_MINUTES ?? 30);
  // A malformed env value would otherwise produce an invalid Date cutoff.
  const ttlMinutes = Number.isFinite(configuredTtl) && configuredTtl > 0 ? configuredTtl : 30;
  const cutoff = new Date(Date.now() - ttlMinutes * 60_000);

  const cancelled = await prisma.$transaction(async (tx) => {
    const staleBookings = await tx.booking.findMany({
      where: {
        status: BookingStatus.PENDING,
        paymentStatus: "UNPAID",
        createdAt: { lt: cutoff },
        metadata: { path: ["whatsappBooking"], equals: true },
      },
      select: {
        uid: true,
        title: true,
        userId: true,
        attendees: { select: { name: true, phoneNumber: true }, take: 1 },
      },
    });

    let count = 0;
    for (const booking of staleBookings) {
      const res = await tx.booking.updateMany({
        where: { uid: booking.uid, status: BookingStatus.PENDING, paymentStatus: "UNPAID" },
        data: { status: BookingStatus.CANCELLED },
      });
      if (res.count === 0) continue;
      count += 1;

      const attendee = booking.attendees[0];
      const customer = attendee?.name ?? attendee?.phoneNumber ?? "Customer";
      if (booking.userId) {
        await tx.alert.create({
          data: {
            userId: booking.userId,
            type: "BOOKING_CANCELLED",
            channel: "IN_APP",
            title: `❌ Booking Cancelled — ${booking.title}`,
            body: `The WhatsApp reservation for ${booking.title} (${customer}) was cancelled because the M-Pesa deposit was never completed.`,
            metadata: {
              bookingUid: booking.uid,
              source: "whatsapp-bot",
              reason: "PAYMENT_TIMEOUT",
            },
          },
        });
      }
    }
    return count;
  });

  return NextResponse.json({ cancelled });
}

export const POST = defaultResponderForAppDir(postHandler);
