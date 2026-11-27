import crypto from "node:crypto";
import process from "node:process";
import { normalizeKenyanPhone } from "@kalo/features/mpesa/normalizePhone";
import { WhatsAppSessionRepository } from "@kalo/features/whatsapp-bot/src/sessionStore";
import prisma from "@kalo/prisma";
import type { Prisma } from "@kalo/prisma/client";
import { BookingStatus } from "@kalo/prisma/enums";
import type { NextApiRequest, NextApiResponse } from "next";

type StkCallbackItem = { Name: string; Value: string | number };

/**
 * Constant-time comparison for the callback secret — a shared credential,
 * unlike the plain string compares used for non-secret values.
 */
function safeEqual(a: unknown, b: string): boolean {
  if (typeof a !== "string") return false;
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  return aBuf.length === bBuf.length && crypto.timingSafeEqual(aBuf, bBuf);
}

/**
 * The phones a conversation's session may be stored under (raw + normalized),
 * matching how the WhatsApp webhook service keys sessions. The callback's own
 * phone metadata is unverified, so both forms are tried when resolving the
 * customer's session.
 */
function sessionPhoneCandidates(phone: string): string[] {
  const normalized = normalizeKenyanPhone(phone);
  return [phone, normalized].filter((p, index, arr): p is string => Boolean(p) && arr.indexOf(p) === index);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  // Daraja does not sign callbacks. When DARAJA_CALLBACK_SECRET is set, the
  // WhatsApp webhook service appends it to the callback URL it registers in the
  // STK push, so a request without the matching secret did not come from that
  // push — reject it before doing any work.
  const callbackSecret = process.env.DARAJA_CALLBACK_SECRET;
  if (!callbackSecret) {
    console.error("DARAJA_CALLBACK_SECRET is not configured; refusing unsigned M-Pesa callbacks.");
    return res.status(503).json({ message: "M-Pesa callback verification is not configured" });
  }
  if (!safeEqual(req.query.secret, callbackSecret)) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const body = req.body;
    const stkCallback = body?.Body?.stkCallback;

    if (!stkCallback) {
      return res.status(400).json({ message: "Invalid M-Pesa callback payload" });
    }

    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback;
    const success = ResultCode === 0;

    let amount = 0;
    let mpesaReceiptNumber = "";
    let phoneNumber = "";

    if (success && CallbackMetadata?.Item) {
      for (const item of CallbackMetadata.Item as StkCallbackItem[]) {
        if (item.Name === "Amount") amount = Number(item.Value);
        if (item.Name === "MpesaReceiptNumber") mpesaReceiptNumber = String(item.Value);
        if (item.Name === "PhoneNumber") phoneNumber = String(item.Value);
      }
    }

    // Find existing transaction by CheckoutRequestID
    const existingTx = await prisma.mPesaTransaction.findFirst({
      where: { checkoutRequestId: CheckoutRequestID },
    });

    if (existingTx) {
      // A successful Daraja result is not sufficient by itself: require the
      // complete receipt metadata and reconcile it against the original STK
      // request before any booking, receipt, or notification side-effects.
      if (success) {
        const normalizedCallbackPhone = normalizeKenyanPhone(phoneNumber);
        const normalizedRecordedPhone = normalizeKenyanPhone(existingTx.phoneNumber);
        const metadataIsComplete =
          Number.isFinite(amount) && amount > 0 && Boolean(mpesaReceiptNumber) && Boolean(normalizedCallbackPhone);
        // Daraja STK accepts whole KES amounts; the client rounds up when
        // initiating the request, so reconcile against that exact submitted value.
        const amountMatches = amount === Math.ceil(existingTx.amount);
        const phoneMatches =
          Boolean(normalizedCallbackPhone) &&
          Boolean(normalizedRecordedPhone) &&
          normalizedCallbackPhone === normalizedRecordedPhone;

        if (!metadataIsComplete || !amountMatches || !phoneMatches) {
          const reasons = [
            !metadataIsComplete ? "incomplete success metadata" : null,
            !amountMatches ? "amount mismatch" : null,
            !phoneMatches ? "phone mismatch" : null,
          ].filter(Boolean);
          await prisma.mPesaTransaction.update({
            where: { id: existingTx.id },
            data: {
              status: "RECONCILIATION_REQUIRED",
              resultDesc: `Daraja success requires manual reconciliation: ${reasons.join(", ")}`,
            },
          });
          console.error(
            `M-Pesa callback requires reconciliation for ${CheckoutRequestID}: ${reasons.join(", ")}`
          );
          return res.status(200).json({ ResultCode: 0, ResultDesc: "Callback received; payment pending reconciliation" });
        }
      }
      // The callback's phone metadata is Daraja-supplied but unverified. When it
      // contradicts the phone we recorded when initiating the push, prefer the
      // recorded one (and flag it) so a forged callback can't resolve a
      // stranger's conversation or stamp a wrong phone on a receipt.
      const callbackPhoneMatches =
        !phoneNumber || !existingTx.phoneNumber || phoneNumber === existingTx.phoneNumber;
      if (!callbackPhoneMatches) {
        console.warn(
          `M-Pesa callback phone mismatch for ${CheckoutRequestID}: ` +
            `callback=${phoneNumber}, recorded=${existingTx.phoneNumber}`
        );
      }
      const customerPhone = callbackPhoneMatches
        ? phoneNumber || existingTx.phoneNumber
        : existingTx.phoneNumber;
      // Daraja retries callbacks until it receives HTTP 200. Only run the payment
      // side-effects (receipt, alerts, WhatsApp logs, session resolution) the first
      // time we observe the transaction — otherwise retries duplicate receipts.
      const isWhatsAppPayment = existingTx.source === "whatsapp-bot";
      const isNewOutcome = existingTx.status !== "SUCCESS";

      // Booking + receipt + alert + optional WhatsApp side-effects + status flip are
      // atomic in one transaction: either they all succeed or none do. This keeps
      // Daraja's callback retries idempotent — a mid-block throw rolls everything
      // back, the status stays PENDING, and the retry re-runs cleanly instead of
      // duplicating receipts.
      await prisma.$transaction(async (tx) => {
        if (success && existingTx.bookingUid) {
          // The customer did pay, so the booking is paid regardless of its
          // current status (the webhook service creates it as a PENDING
          // reservation when the STK push fires).
          const updatedBooking = await tx.booking.update({
            where: { uid: existingTx.bookingUid },
            data: {
              paymentStatus: "DEPOSIT_PAID",
              paid: true,
            },
            select: {
              uid: true,
              title: true,
              userId: true,
              status: true,
              attendees: { select: { name: true }, take: 1 },
              user: { select: { id: true, name: true, email: true } },
            },
          });

          // Confirming the payment confirms the reservation — but only promote a
          // still-pending booking; one the vendor already cancelled or rejected
          // before the payment landed must not be resurrected.
          if (updatedBooking.status === BookingStatus.PENDING) {
            await tx.booking.update({
              where: { uid: updatedBooking.uid },
              data: { status: BookingStatus.ACCEPTED },
            });
          }

          if (isNewOutcome) {
            // 1. Generate sequential receipt number
            const today = new Date();
            const dateStr =
              today.getFullYear().toString() +
              String(today.getMonth() + 1).padStart(2, "0") +
              String(today.getDate()).padStart(2, "0");
            const count = await tx.receipt.count({
              where: { issuedAt: { gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()) } },
            });
            const receiptNumber = `RCP-${dateStr}-${String(count + 1).padStart(4, "0")}`;

            // 2. Create Receipt record
            const receipt = await tx.receipt.create({
              data: {
                receiptNumber,
                bookingUid: updatedBooking.uid,
                vendorUserId: updatedBooking.userId ?? 1,
                customerPhone,
                customerName: updatedBooking.attendees?.[0]?.name || "Customer",
                lineItemsJson: [
                  {
                    description: updatedBooking.title || "Service Deposit",
                    qty: 1,
                    unitPrice: amount || existingTx.amount,
                    total: amount || existingTx.amount,
                  },
                ],
                subtotal: amount || existingTx.amount,
                depositPaid: amount || existingTx.amount,
                totalAmount: amount || existingTx.amount,
                mpesaReceiptNumber: mpesaReceiptNumber || null,
                paymentMethod: "M-Pesa",
                sentViaWhatsapp: isWhatsAppPayment,
              },
            });

            // 3. Create PAYMENT_RECEIVED alert for vendor
            if (updatedBooking.userId) {
              await tx.alert.create({
                data: {
                  userId: updatedBooking.userId,
                  type: "PAYMENT_RECEIVED",
                  channel: "IN_APP",
                  title: `💰 Payment Received — ${receipt.receiptNumber}`,
                  body: `KES ${(amount || existingTx.amount).toLocaleString()} received via M-Pesa (${mpesaReceiptNumber}) for booking ${updatedBooking.title}.`,
                  metadata: {
                    receiptId: receipt.id,
                    receiptNumber: receipt.receiptNumber,
                    mpesaReceiptNumber,
                    bookingUid: updatedBooking.uid,
                  },
                },
              });

              // WhatsApp-specific customer log; generic M-Pesa payments do not create bot messages.
              if (isWhatsAppPayment) {
                await tx.whatsAppMessageLog.create({
                  data: {
                    userId: updatedBooking.userId,
                    customerPhone,
                    direction: "OUTBOUND",
                    message:
                      `✅ *M-Pesa Payment Received!*\n\n` +
                      `Receipt No: *${receipt.receiptNumber}*\n` +
                      `M-Pesa Ref: *${mpesaReceiptNumber}*\n` +
                      `Amount Paid: *KES ${(amount || existingTx.amount).toLocaleString()}*\n\n` +
                      `Your booking for *${updatedBooking.title}* is now CONFIRMED. Thank you!`,
                    state: "CONFIRMED",
                  },
                });
              }

            }
          }
        }

        // Resolve only WhatsApp-originated conversations server-side. Generic
        // M-Pesa transactions must not mutate a WhatsApp session. This runs even
        // when no booking is linked yet (the WhatsApp bot flow records transactions
        // before a booking exists). It lives inside the same
        // transaction, bound to the tx client — so a rollback also rolls the
        // session write back, and a committed tx guarantees the session write
        // happened (Daraja's retry won't skip it after seeing status SUCCESS).
        if (isWhatsAppPayment && success && isNewOutcome) {
          if (customerPhone) {
            const txSessionRepository = new WhatsAppSessionRepository({ prismaClient: tx });
            for (const candidate of sessionPhoneCandidates(customerPhone)) {
              const updated = await txSessionRepository.markPaymentVerified(
                candidate,
                mpesaReceiptNumber || undefined
              );
              if (updated) break;
            }
          }
        }

        // A failed payment cancels the reservation it was linked to, so abandoned
        // STK pushes don't leave phantom unpaid PENDING bookings behind. The
        // status guard makes Daraja's callback retries idempotent (the second
        // attempt finds the booking already CANCELLED and matches nothing) and
        // ensures an already-confirmed booking is never touched.
        if (!success && existingTx.bookingUid) {
          const booking = await tx.booking.findFirst({
            where: { uid: existingTx.bookingUid },
            select: { uid: true, title: true, userId: true, startTime: true },
          });
          const cancelled = await tx.booking.updateMany({
            where: { uid: existingTx.bookingUid, status: BookingStatus.PENDING },
            data: { status: BookingStatus.CANCELLED },
          });

          // Only the call that actually transitioned the booking PENDING ->
          // CANCELLED raises the vendor alert — a Daraja retry finds count 0 and
          // stays silent, so vendors see each abandoned reservation exactly once.
          // The alert is created in the same transaction, so a rollback also
          // rolls the alert back.
          if (booking && cancelled.count > 0 && booking.userId) {
            // The bot's attendees are stored in Africa/Nairobi (see
            // createBookingForContext), so the slot time is shown in that zone.
            const slotTime = booking.startTime.toLocaleString("en-KE", {
              timeZone: "Africa/Nairobi",
            });
            await tx.alert.create({
              data: {
                userId: booking.userId,
                type: "BOOKING_CANCELLED",
                channel: "IN_APP",
                title: `❌ Booking Cancelled — ${booking.title}`,
                body: `The WhatsApp reservation for ${booking.title} (${slotTime}) was cancelled because the M-Pesa deposit payment was not completed.`,
                metadata: {
                  bookingUid: booking.uid,
                  customerPhone: existingTx.phoneNumber,
                  source: "whatsapp-bot",
                  reason: "PAYMENT_FAILED",
                  resultDesc: ResultDesc,
                },
              },
            });
          }
        }

        // Tell the WhatsApp bot the payment failed so it surfaces the failure to
        // the customer instead of accepting a "done" reply as confirmation. Gated
        // on the transaction still being PENDING — the mark is atomic with the
        // status flip below, so a Daraja retry finds status FAILED and skips,
        // meaning a rebooked conversation's fresh session is never clobbered by a
        // stale failure callback. Runs even without a linked booking (the STK
        // resilience fallback records transactions without one).
        if (isWhatsAppPayment && !success && existingTx.status === "PENDING" && customerPhone) {
          const txSessionRepository = new WhatsAppSessionRepository({ prismaClient: tx });
          for (const candidate of sessionPhoneCandidates(customerPhone)) {
            const updated = await txSessionRepository.markPaymentFailed(candidate);
            if (updated) break;
          }
        }

        // Apply a subscription period only on the first verified callback.
        // Daraja STK is user-authorized on every renewal; this is not a silent
        // recurring card debit.
        if (existingTx.subscriptionId && isNewOutcome) {
          const subscription = await tx.mPesaSubscription.findUnique({
            where: { id: existingTx.subscriptionId },
          });
          if (subscription) {
            if (success) {
              const now = new Date();
              const periodStart =
                subscription.currentPeriodEnd && subscription.currentPeriodEnd > now
                  ? subscription.currentPeriodEnd
                  : now;
              const periodEnd = new Date(periodStart);
              if (subscription.billingPeriod === "ANNUALLY") {
                periodEnd.setFullYear(periodEnd.getFullYear() + 1);
              } else {
                periodEnd.setMonth(periodEnd.getMonth() + 1);
              }

              let subscriptionStatus = "ACTIVE";
              if (subscription.subscriptionType === "PREMIUM_USERNAME" && subscription.userId && subscription.username) {
                const user = await tx.user.findUnique({
                  where: { id: subscription.userId },
                  select: { metadata: true },
                });
                if (user) {
                  try {
                    const metadata =
                      user.metadata && typeof user.metadata === "object" && !Array.isArray(user.metadata)
                        ? (user.metadata as Prisma.JsonObject)
                        : {};
                    await tx.user.update({
                      where: { id: subscription.userId },
                      data: {
                        username: subscription.username,
                        metadata: { ...metadata, isPremium: true },
                      },
                    });
                  } catch {
                    // The customer has paid; preserve the payment and route the
                    // username collision to manual reconciliation, not a retry.
                    subscriptionStatus = "RECONCILIATION_REQUIRED";
                  }
                } else {
                  subscriptionStatus = "RECONCILIATION_REQUIRED";
                }
              }

              await tx.mPesaSubscription.update({
                where: { id: subscription.id },
                data: {
                  status: subscriptionStatus,
                  currentPeriodStart: periodStart,
                  currentPeriodEnd: periodEnd,
                  nextBillingAt: periodEnd,
                  lastPaymentAt: now,
                },
              });

              if (subscription.teamId && subscription.subscriptionType === "TEAM") {
                const billingData = {
                  mpesaSubscriptionId: subscription.id,
                  status: subscriptionStatus,
                  planName: subscription.planName,
                  subscriptionStart: periodStart,
                  subscriptionEnd: periodEnd,
                  billingPeriod: subscription.billingPeriod ?? "MONTHLY",
                  billingMode: subscription.billingMode ?? "SEATS",
                  pricePerSeat: subscription.pricePerSeat,
                  paidSeats: subscription.paidSeats,
                };
                await tx.teamBilling.upsert({
                  where: { teamId: subscription.teamId },
                  create: { teamId: subscription.teamId, ...billingData },
                  update: billingData,
                });
              }

              if (subscription.teamId && subscription.subscriptionType === "ORGANIZATION") {
                const billingData = {
                  mpesaSubscriptionId: subscription.id,
                  status: subscriptionStatus,
                  planName: subscription.planName,
                  subscriptionStart: periodStart,
                  subscriptionEnd: periodEnd,
                  billingPeriod: subscription.billingPeriod ?? "MONTHLY",
                  billingMode: subscription.billingMode ?? "SEATS",
                  pricePerSeat: subscription.pricePerSeat,
                  paidSeats: subscription.paidSeats,
                };
                await tx.organizationBilling.upsert({
                  where: { teamId: subscription.teamId },
                  create: { teamId: subscription.teamId, ...billingData },
                  update: billingData,
                });
              }

              if (subscription.teamId) {
                await tx.platformBilling.updateMany({
                  where: { id: subscription.teamId },
                  data: {
                    mpesaSubscriptionId: subscription.id,
                    plan: subscription.planName,
                    overdue: false,
                    billingCycleStart: Math.floor(periodStart.getTime() / 1000),
                    billingCycleEnd: Math.floor(periodEnd.getTime() / 1000),
                  },
                });
              }
            } else {
              await tx.mPesaSubscription.update({
                where: { id: subscription.id },
                data: { status: "PAST_DUE" },
              });
              if (subscription.teamId && subscription.subscriptionType === "TEAM") {
                await tx.teamBilling.updateMany({
                  where: { teamId: subscription.teamId },
                  data: { status: "PAST_DUE" },
                });
              }
              if (subscription.teamId && subscription.subscriptionType === "ORGANIZATION") {
                await tx.organizationBilling.updateMany({
                  where: { teamId: subscription.teamId },
                  data: { status: "PAST_DUE" },
                });
              }
              if (subscription.teamId) {
                await tx.platformBilling.updateMany({
                  where: { id: subscription.teamId },
                  data: { overdue: true },
                });
              }
            }
          }
        }

        // Link verified Daraja outcomes to the first-party booking payment.
        // The update is in the same DB transaction as booking confirmation and
        // receipt creation, so retries cannot leave the payment and booking split.
        if (existingTx.paymentId) {
          await tx.payment.update({
            where: { id: existingTx.paymentId },
            data: {
              success,
              data: {
                provider: "mpesa",
                status: success ? "SUCCESS" : "FAILED",
                checkoutRequestId: CheckoutRequestID,
                merchantRequestId: existingTx.merchantRequestId,
                mpesaReceiptNumber: mpesaReceiptNumber || null,
                phoneNumber: existingTx.phoneNumber,
                amount: success ? amount : existingTx.amount,
                resultDesc: ResultDesc,
                ...(success ? { paidAt: new Date().toISOString() } : {}),
              },
            },
          });
        }

        // Update the transaction outcome inside the same transaction, so a throw
        // above rolls back and the status stays PENDING for the retry.
        await tx.mPesaTransaction.update({
          where: { id: existingTx.id },
          data: {
            status: success ? "SUCCESS" : "FAILED",
            resultDesc: ResultDesc,
            mpesaReceiptNumber: mpesaReceiptNumber || null,
            amount: amount || existingTx.amount,
          },
        });
      });
    }

    // Safaricom expects a 200 OK JSON response
    return res.status(200).json({ ResultCode: 0, ResultDesc: "Callback accepted" });
  } catch (error) {
    console.error("Error processing M-Pesa callback:", error);
    return res.status(500).json({ ResultCode: 1, ResultDesc: "Internal Server Error" });
  }
}
