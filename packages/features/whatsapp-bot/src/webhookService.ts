import { randomUUID } from "node:crypto";
import process from "node:process";
import type { PrismaClient } from "@calcom/prisma";
import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { BookingStatus, CreationSource } from "@calcom/prisma/enums";
import { DarajaClient } from "../../mpesa/darajaClient";
import { normalizeKenyanPhone } from "../../mpesa/normalizePhone";
import type { WhatsAppSessionRepository } from "./sessionStore";
import { whatsAppSessionRepository } from "./sessionStore";
import type { EventTypeItem } from "./stateMachine";
import { WhatsAppStateMachine } from "./stateMachine";
import type { ConversationState, UserSessionContext } from "./types";

export interface WhatsAppWebhookMessage {
  /** Customer's WhatsApp number, e.g. "254712345678". */
  from: string;
  /** Message body text. */
  body: string;
}

export interface WhatsAppWebhookResult {
  replyText: string;
  state: ConversationState;
  stkPushTriggered: boolean;
}

export interface WhatsAppWebhookDeps {
  prismaClient?: PrismaClient;
  sessionRepository?: WhatsAppSessionRepository;
  /** Overridable for tests; defaults to the real DarajaClient. */
  initiateStkPush?: typeof DarajaClient.initiateStkPush;
}

const vendorSelect = {
  id: true,
  name: true,
  username: true,
  mpesaPaybill: true,
  mpesaTillNumber: true,
  mpesaShortcode: true,
  mpesaPasskey: true,
} as const;

const eventTypeSelect = {
  id: true,
  title: true,
  price: true,
  depositAmount: true,
  length: true,
} as const;

/**
 * End-to-end handler for an incoming WhatsApp message:
 *
 * 1. Loads the customer's `UserSessionContext` from the WhatsAppSession table
 *    (creating a fresh IDLE session when none exists).
 * 2. Loads the vendor's M-Pesa details + service catalog from the DB.
 * 3. Runs the booking state machine.
 * 4. Persists the resulting context so the conversation survives restarts and
 *    works across multiple webhooks.
 * 5. When the state machine asks for an STK push, fires it via DarajaClient and
 *    records an MPesaTransaction (checkoutRequestId) so the M-Pesa callback can
 *    confirm the payment server-side.
 *
 * The reply text is returned to the caller; sending it back over WhatsApp is the
 * WhatsApp engine's job (not present in this worktree).
 */
export class WhatsAppWebhookService {
  private db: PrismaClient;
  private sessionRepository: WhatsAppSessionRepository;
  private initiateStkPush: typeof DarajaClient.initiateStkPush;

  constructor(deps: WhatsAppWebhookDeps = {}) {
    this.db = deps.prismaClient ?? prisma;
    this.sessionRepository = deps.sessionRepository ?? whatsAppSessionRepository;
    this.initiateStkPush = deps.initiateStkPush ?? DarajaClient.initiateStkPush;
  }

  async handleMessage({ from, body }: WhatsAppWebhookMessage): Promise<WhatsAppWebhookResult> {
    if (!from || !body) {
      throw new Error("WhatsApp webhook payload missing 'from' or message body");
    }

    const phone = normalizeKenyanPhone(from) ?? from;

    const existingSession = await this.sessionRepository.getSession(phone);
    const vendor = await this.loadVendor(existingSession?.vendorUserId);

    const context: UserSessionContext =
      existingSession ??
      ({
        customerPhone: phone,
        vendorUserId: vendor.id,
        state: "IDLE",
      } satisfies UserSessionContext);

    const vendorName = vendor.name ?? vendor.username ?? "Vendor";
    const eventTypes: EventTypeItem[] = vendor.eventTypes.map((eventType) => ({
      id: eventType.id,
      title: eventType.title,
      price: eventType.price,
      depositAmount: eventType.depositAmount,
      duration: eventType.length,
    }));

    // The machine only offers the STK push path when the vendor has shortcode +
    // passkey. Those alone are not enough — the push needs the global Daraja env
    // (consumer key/secret/callback URL) too. Withhold the STK credentials when
    // the env isn't wired so the machine falls back to the honest till/paybill
    // manual-receipt path instead of promising a prompt that can never fire.
    const darajaConfigured =
      Boolean(process.env.DARAJA_CONSUMER_KEY) &&
      Boolean(process.env.DARAJA_CONSUMER_SECRET) &&
      Boolean(process.env.DARAJA_CALLBACK_URL);

    const vendorMpesaDetails = {
      paybill: vendor.mpesaPaybill ?? undefined,
      tillNumber: vendor.mpesaTillNumber ?? undefined,
      shortcode: darajaConfigured ? (vendor.mpesaShortcode ?? undefined) : undefined,
      passkey: darajaConfigured ? (vendor.mpesaPasskey ?? undefined) : undefined,
    };

    const res = await WhatsAppStateMachine.processMessage(
      body,
      context,
      vendorName,
      eventTypes,
      vendorMpesaDetails
    );

    let nextContext = res.nextContext;
    let replyText = res.replyText;
    let stkPushTriggered = false;

    // Fire the STK push the state machine requested, then record the transaction
    // so the M-Pesa callback can resolve the payment against checkoutRequestId.
    const stkPushRequest = res.triggerStkPush;
    if (stkPushRequest) {
      // Daraja doesn't sign callbacks; when a callback secret is configured,
      // embed it in the callback URL registered with this push so the M-Pesa
      // callback handler can reject forged callbacks that lack it.
      let callbackUrl = process.env.DARAJA_CALLBACK_URL ?? "";
      const callbackSecret = process.env.DARAJA_CALLBACK_SECRET;
      if (callbackSecret) {
        const separator = callbackUrl.includes("?") ? "&" : "?";
        callbackUrl += `${separator}secret=${encodeURIComponent(callbackSecret)}`;
      }

      let stkPush: { checkoutRequestId: string; merchantRequestId?: string } | null = null;
      try {
        const darajaResponse = await this.initiateStkPush({
          consumerKey: process.env.DARAJA_CONSUMER_KEY ?? "",
          consumerSecret: process.env.DARAJA_CONSUMER_SECRET ?? "",
          businessShortCode: vendor.mpesaShortcode ?? "",
          passkey: vendor.mpesaPasskey ?? "",
          phoneNumber: stkPushRequest.phoneNumber,
          amount: stkPushRequest.amount,
          accountReference: stkPushRequest.accountRef,
          transactionDesc: "Booking deposit",
          callbackUrl,
          isSandbox: (process.env.DARAJA_ENVIRONMENT ?? "sandbox") !== "production",
        });

        stkPush = {
          checkoutRequestId: darajaResponse.CheckoutRequestID,
          merchantRequestId: darajaResponse.MerchantRequestID,
        };
        nextContext = { ...nextContext, checkoutRequestId: darajaResponse.CheckoutRequestID };
        stkPushTriggered = true;
      } catch (error) {
        // The state machine's reply promised a prompt that never went out — be
        // honest with the customer instead of leaving them waiting on nothing.
        console.error("M-Pesa STK push failed from WhatsApp webhook:", error);
        replyText =
          `⚠️ We couldn't send the M-Pesa payment prompt just now.\n\n` +
          `Please try again in a moment, or reply *0* for the main menu.`;
        // Keep the state the machine produced (WAITING_MPESA_STK) so a retry
        // via the menu is possible; no transaction was recorded.
      }

      // Materialize the reservation and record the transaction atomically: the
      // M-Pesa callback gates its booking update + receipt/alert path behind
      // bookingUid, so the transaction must never be observable without its
      // linked booking — a callback racing the write would otherwise skip
      // receipts and leave the reservation PENDING forever.
      if (stkPush) {
        const { checkoutRequestId, merchantRequestId } = stkPush;
        let createdBooking: { uid: string } | null = null;
        try {
          createdBooking = await this.db.$transaction(async (tx) => {
            const booking = await this.createBookingForContext(
              nextContext,
              eventTypes,
              { paymentConfirmed: false },
              tx
            );
            await tx.mPesaTransaction.create({
              data: {
                phoneNumber: stkPushRequest.phoneNumber,
                amount: stkPushRequest.amount,
                checkoutRequestId,
                merchantRequestId,
                status: "PENDING",
                ...(booking ? { bookingUid: booking.uid } : {}),
              },
            });
            return booking;
          });
        } catch (error) {
          // The push reached Daraja but the reservation write failed (e.g. a DB
          // hiccup). Best-effort record the transaction WITHOUT a booking so the
          // M-Pesa callback can still resolve the payment server-side — better
          // that the customer's session confirms than the payment silently
          // disappearing because no transaction was ever recorded. The callback
          // simply skips its receipt/alert path for this payment.
          console.error("Failed to record M-Pesa reservation after STK push:", error);
          try {
            await this.db.mPesaTransaction.create({
              data: {
                phoneNumber: stkPushRequest.phoneNumber,
                amount: stkPushRequest.amount,
                checkoutRequestId,
                merchantRequestId,
                status: "PENDING",
              },
            });
          } catch (recordError) {
            console.error("Failed to record M-Pesa transaction after STK push:", recordError);
          }
        }
        if (createdBooking) {
          nextContext = { ...nextContext, bookingUid: createdBooking.uid };
        }
      }
    }

    // The M-Pesa callback may have marked the session paymentVerified while we
    // were processing (concurrent webhook + callback read-modify-write the same
    // sessionData JSON column). The state machine's nextContext was built from a
    // stale read, so a full-column save would clobber that server-side
    // confirmation. Re-read the freshest copy right before saving and merge the
    // server-side evidence back in — unless the machine deliberately reset it
    // (paymentVerified: false on menu reset / new deposit flow), in which case
    // the reset must win so an old payment can't confirm a new booking.
    let sessionToPersist: UserSessionContext = { ...nextContext };
    if (sessionToPersist.paymentVerified !== false) {
      const freshSession = await this.sessionRepository.getSession(phone);
      if (freshSession?.paymentVerified) {
        sessionToPersist = {
          ...sessionToPersist,
          paymentVerified: true,
          ...(freshSession.mpesaReceiptCode ? { mpesaReceiptCode: freshSession.mpesaReceiptCode } : {}),
        };
      }
      // The callback's failure evidence must survive the full-column save too,
      // so a message racing the failure callback can't clobber it. (The machine
      // deliberately resets paymentVerified — and with it paymentFailed — when
      // starting a fresh flow or returning to the menu, so the reset wins there.)
      // The machine ran on a stale read that didn't know about the failure, so
      // if it moved the conversation to CONFIRMED, pull it back to
      // WAITING_MPESA_STK — otherwise the bot parks in a false CONFIRMED state
      // and the failure is never surfaced.
      if (freshSession?.paymentFailed) {
        sessionToPersist = {
          ...sessionToPersist,
          paymentFailed: true,
          state: sessionToPersist.state === "CONFIRMED" ? "WAITING_MPESA_STK" : sessionToPersist.state,
        };
      }
    }

    // A conversation that confirmed without an STK push (manual M-Pesa receipt
    // or no-deposit flow) needs a Booking record too. STK flows already created
    // theirs when the push fired, so the bookingUid guard keeps this idempotent.
    // The booking + NEW_BOOKING alert are created atomically.
    if (sessionToPersist.state === "CONFIRMED" && !sessionToPersist.bookingUid) {
      const createdBooking = await this.db.$transaction(async (tx) =>
        this.createBookingForContext(sessionToPersist, eventTypes, { paymentConfirmed: true }, tx)
      );
      if (createdBooking) {
        sessionToPersist = { ...sessionToPersist, bookingUid: createdBooking.uid };
      }
    }

    await this.sessionRepository.saveSession(phone, sessionToPersist);

    return {
      replyText,
      state: sessionToPersist.state,
      stkPushTriggered,
    };
  }

  /**
   * Creates the Booking record for a WhatsApp conversation and links the
   * conversation's M-Pesa transaction(s) to it via bookingUid.
   *
   * Called in two moments:
   * - when the STK push fires (`paymentConfirmed: false`) — the booking is a
   *   PENDING reservation, so the Daraja callback finds it linked and can flip
   *   it to ACCEPTED and run the receipt/alert/WhatsApp-log path;
   * - when the conversation confirms without an STK push (`paymentConfirmed:
   *   true`, manual receipt / no-deposit) — the booking is created ACCEPTED
   *   and a NEW_BOOKING alert is raised for the vendor (STK reservations are
   *   not alerted here — they surface as PAYMENT_RECEIVED from the Daraja
   *   callback once the deposit lands).
   *
   * Returns null (no-op) when the conversation has no event type selected or
   * already has a booking — the bookingUid guard keeps the whole flow
   * idempotent across webhook retries. The optional `db` client lets the STK
   * path create the booking inside the same transaction as the transaction
   * record (so the callback can never see an unlinked transaction).
   */
  private async createBookingForContext(
    context: UserSessionContext,
    eventTypes: EventTypeItem[],
    opts: { paymentConfirmed: boolean },
    db: PrismaClient | Prisma.TransactionClient = this.db
  ): Promise<{ uid: string } | null> {
    if (!context.selectedEventTypeId || context.bookingUid) return null;
    const eventType = eventTypes.find((et) => et.id === context.selectedEventTypeId);
    if (!eventType) return null;

    const deposit = context.depositAmount || 0;
    const paid = opts.paymentConfirmed && deposit > 0;
    const startTime = context.selectedSlotIso ? new Date(context.selectedSlotIso) : new Date();
    const endTime = new Date(startTime.getTime() + eventType.duration * 60_000);
    const uid = randomUUID();

    const booking = await db.booking.create({
      data: {
        uid,
        title: eventType.title,
        userId: context.vendorUserId,
        eventTypeId: context.selectedEventTypeId,
        startTime,
        endTime,
        status: opts.paymentConfirmed ? BookingStatus.ACCEPTED : BookingStatus.PENDING,
        paymentStatus: paid ? "DEPOSIT_PAID" : "UNPAID",
        paid,
        creationSource: CreationSource.WEBAPP,
        // Marks the booking as bot-created so the stale-reservation cron can
        // target it without touching Cal's own PENDING bookings.
        metadata: { whatsappBooking: true },
        attendees: {
          create: {
            // The WhatsApp flow only collects a name + phone; the attendee
            // email is a deterministic placeholder derived from the phone.
            name: context.customerName || "WhatsApp Customer",
            email: `${context.customerPhone}@whatsapp.local`,
            phoneNumber: context.customerPhone,
            timeZone: "Africa/Nairobi",
          },
        },
      },
      select: { uid: true },
    });

    // Link any of the conversation's not-yet-linked transactions (e.g. a
    // callback that raced the booking creation). In the STK path this runs
    // before the transaction is recorded inside the same $transaction, so it
    // matches nothing and the transaction embeds bookingUid directly. Only
    // still-pending transactions are linked: a transaction whose payment
    // already failed (or belongs to an abandoned attempt) must not be attached
    // to a fresh booking, or its late callback could act on the wrong booking.
    await db.mPesaTransaction.updateMany({
      where: { phoneNumber: context.customerPhone, bookingUid: null, status: "PENDING" },
      data: { bookingUid: booking.uid },
    });

    // Confirmed-without-STK bookings get a NEW_BOOKING alert so the vendor sees
    // them in the dashboard. Created on the same client as the booking (inside
    // the caller's transaction when there is one), so a rollback rolls the
    // alert back too.
    if (opts.paymentConfirmed && context.vendorUserId) {
      // The attendee is stored in Africa/Nairobi (see below), so the slot time
      // is shown in that zone, matching the cancellation alerts.
      const slotTime = context.selectedSlotIso
        ? new Date(context.selectedSlotIso).toLocaleString("en-KE", { timeZone: "Africa/Nairobi" })
        : "";
      await db.alert.create({
        data: {
          userId: context.vendorUserId,
          type: "NEW_BOOKING",
          channel: "IN_APP",
          title: `📅 New Booking — ${eventType.title}`,
          body:
            `${context.customerName || "WhatsApp Customer"} (${context.customerPhone}) booked ` +
            `${eventType.title} via WhatsApp${slotTime ? ` for ${slotTime}` : ""}.` +
            (paid ? " Deposit received." : ""),
          metadata: {
            bookingUid: booking.uid,
            source: "whatsapp-bot",
            payment: paid ? "DEPOSIT_PAID" : "UNPAID",
          },
        },
      });
    }

    return booking;
  }

  /**
   * Resolves the vendor serving this customer. Uses the session's own
   * vendorUserId when the conversation already exists; for a brand-new
   * conversation, falls back to WHATSAPP_DEFAULT_VENDOR_USER_ID.
   */
  private async loadVendor(vendorUserIdFromSession?: number) {
    const vendorUserId = vendorUserIdFromSession ?? this.defaultVendorUserId();

    const vendor = await this.db.user.findUnique({
      where: { id: vendorUserId },
      select: {
        ...vendorSelect,
        eventTypes: {
          select: eventTypeSelect,
          where: { hidden: false },
          orderBy: { position: "asc" },
        },
      },
    });

    if (!vendor) {
      throw new Error(`Vendor user ${vendorUserId} not found`);
    }

    return vendor;
  }

  private defaultVendorUserId(): number {
    const fromEnv = Number(process.env.WHATSAPP_DEFAULT_VENDOR_USER_ID);
    if (Number.isInteger(fromEnv) && fromEnv > 0) {
      return fromEnv;
    }
    throw new Error("No default vendor configured: set WHATSAPP_DEFAULT_VENDOR_USER_ID in the environment");
  }
}

export const whatsAppWebhookService = new WhatsAppWebhookService();
