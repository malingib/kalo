import { v4 as uuidv4 } from "uuid";

import dayjs from "@kalo/dayjs";
import tasker from "@kalo/features/tasker";
import { DarajaClient, decryptMpesaSecret, encryptMpesaSecret, normalizeKenyanPhone } from "@kalo/features/mpesa";
import { convertFromSmallestToPresentableCurrencyUnit } from "@kalo/lib/currencyConversions";
import prisma from "@kalo/prisma";
import type { Booking, Payment, PaymentOption, Prisma } from "@kalo/prisma/client";
import type { EventTypeMetadata } from "@kalo/prisma/zod-utils";
import type { CalendarEvent } from "@kalo/types/Calendar";
import type { IAbstractPaymentService } from "@kalo/types/PaymentService";

const requiredEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
};

const getCallbackUrl = () => {
  const callbackUrl = new URL(requiredEnv("DARAJA_CALLBACK_URL"));
  const secret = requiredEnv("DARAJA_CALLBACK_SECRET");
  callbackUrl.searchParams.set("secret", secret);
  return callbackUrl.toString();
};

export class PaymentService implements IAbstractPaymentService {
  constructor(_credentials: { key: Prisma.JsonValue }) {}

  async create(
    payment: Pick<Prisma.PaymentUncheckedCreateInput, "amount" | "currency">,
    bookingId: Booking["id"],
    _userId: Booking["userId"],
    _username: string | null,
    _bookerName: string | null,
    paymentOption: PaymentOption,
    _bookerEmail: string,
    bookerPhoneNumber?: string | null,
    _eventTitle?: string,
    _bookingTitle?: string
  ): Promise<Payment> {
    if (paymentOption !== "ON_BOOKING") {
      throw new Error("M-Pesa supports payment on booking only; card holds are not supported");
    }
    if (payment.currency.toUpperCase() !== "KES") {
      throw new Error("Native M-Pesa checkout requires KES pricing");
    }
    const phoneNumber = bookerPhoneNumber ? normalizeKenyanPhone(bookerPhoneNumber) : null;
    if (!phoneNumber) throw new Error("A valid Kenyan mobile number is required for M-Pesa");

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        uid: true,
        userId: true,
        user: { select: { mpesaShortcode: true, mpesaPasskey: true } },
      },
    });
    if (!booking) throw new Error("Booking not found");

    // Booking creation can be retried by upstream workers. Reuse an existing
    // pending STK attempt rather than prompting the customer more than once.
    const existingPayment = await prisma.payment.findFirst({
      where: { bookingId, appId: "mpesa", success: false },
      orderBy: { id: "desc" },
      include: { mpesaTransaction: true },
    });
    if (existingPayment?.mpesaTransaction) {
      const existingStatus = existingPayment.mpesaTransaction.status;
      if (["INITIATING", "PENDING", "PROCESSING"].includes(existingStatus)) {
        return existingPayment;
      }
      if (existingStatus === "RECONCILIATION_REQUIRED") {
        throw new Error("payment_pending_reconciliation_error");
      }
    }

    if (!booking.userId || !booking.user?.mpesaShortcode || !booking.user.mpesaPasskey) {
      throw new Error("The booking host has not configured M-Pesa STK credentials");
    }

    // Booking payments use the host's own Daraja shortcode and encrypted
    // passkey. Platform credentials are reserved for KALO subscription billing.
    const businessShortCode = booking.user.mpesaShortcode;
    const storedPasskey = decryptMpesaSecret(booking.user.mpesaPasskey);
    if (!storedPasskey.encrypted) {
      await prisma.user.update({
        where: { id: booking.userId },
        data: { mpesaPasskey: encryptMpesaSecret(storedPasskey.plaintext) },
      });
    }

    const amountKes = convertFromSmallestToPresentableCurrencyUnit(payment.amount, payment.currency);
    if (!Number.isFinite(amountKes) || amountKes <= 0) throw new Error("Invalid M-Pesa payment amount");

    const paymentUid = uuidv4();
    const { paymentRecord, transaction } = await prisma.$transaction(async (tx) => {
      const paymentRecord = await tx.payment.create({
        data: {
          uid: paymentUid,
          app: { connect: { slug: "mpesa" } },
          booking: { connect: { id: bookingId } },
          amount: payment.amount,
          currency: payment.currency,
          externalId: `mpesa-init-${paymentUid}`,
          data: { provider: "mpesa", phoneNumber, status: "INITIATING" },
          fee: 0,
          refunded: false,
          success: false,
          paymentOption: "ON_BOOKING",
        },
      });
      const transaction = await tx.mPesaTransaction.create({
        data: {
          paymentId: paymentRecord.id,
          bookingUid: booking.uid,
          phoneNumber,
          amount: amountKes,
          source: "booking-payment",
          status: "INITIATING",
        },
      });
      return { paymentRecord, transaction };
    });

    let response: Awaited<ReturnType<typeof DarajaClient.initiateStkPush>>;
    try {
      response = await DarajaClient.initiateStkPush({
        consumerKey: requiredEnv("DARAJA_CONSUMER_KEY"),
        consumerSecret: requiredEnv("DARAJA_CONSUMER_SECRET"),
        businessShortCode,
        passkey: storedPasskey.plaintext,
        phoneNumber,
        amount: amountKes,
        accountReference: booking.uid,
        transactionDesc: "KALO booking",
        callbackUrl: getCallbackUrl(),
        isSandbox: process.env.DARAJA_ENVIRONMENT !== "production",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "M-Pesa STK Push failed";
      await prisma.$transaction([
        prisma.mPesaTransaction.update({
          where: { id: transaction.id },
          data: { status: "FAILED", resultDesc: message },
        }),
        prisma.payment.update({
          where: { id: paymentRecord.id },
          data: { data: { provider: "mpesa", phoneNumber, status: "FAILED", error: message } },
        }),
      ]);
      throw new Error("payment_not_created_error");
    }

    // Once Daraja has accepted the STK request, a local persistence error must
    // never mark the payment FAILED: the customer may still authorize it. Keep
    // the transaction open for reconciliation and avoid inviting a duplicate
    // prompt from a misleading failure state.
    try {
      return await prisma.$transaction(async (tx) => {
        const updatedPayment = await tx.payment.update({
          where: { id: paymentRecord.id },
          data: {
            externalId: response.CheckoutRequestID,
            data: {
              provider: "mpesa",
              phoneNumber,
              status: "PENDING",
              merchantRequestId: response.MerchantRequestID,
              checkoutRequestId: response.CheckoutRequestID,
              customerMessage: response.CustomerMessage,
            },
          },
        });
        await tx.mPesaTransaction.update({
          where: { id: transaction.id },
          data: {
            checkoutRequestId: response.CheckoutRequestID,
            merchantRequestId: response.MerchantRequestID,
            status: "PENDING",
          },
        });
        return updatedPayment;
      });
    } catch (error) {
      console.error("Daraja accepted an M-Pesa prompt but local checkout persistence failed.", {
        paymentId: paymentRecord.id,
        transactionId: transaction.id,
        checkoutRequestId: response.CheckoutRequestID,
        error: error instanceof Error ? error.message : "Unknown persistence error",
      });
      try {
        await prisma.mPesaTransaction.update({
          where: { id: transaction.id },
          data: {
            checkoutRequestId: response.CheckoutRequestID,
            merchantRequestId: response.MerchantRequestID,
            status: "RECONCILIATION_REQUIRED",
            resultDesc: "Daraja accepted STK push; local checkout identifiers require reconciliation",
          },
        });
        await prisma.payment.update({
          where: { id: paymentRecord.id },
          data: {
            data: {
              provider: "mpesa",
              phoneNumber,
              status: "RECONCILIATION_REQUIRED",
              checkoutRequestId: response.CheckoutRequestID,
              merchantRequestId: response.MerchantRequestID,
            },
          },
        });
      } catch (reconciliationError) {
        console.error("Could not persist M-Pesa reconciliation marker.", {
          paymentId: paymentRecord.id,
          transactionId: transaction.id,
          error: reconciliationError instanceof Error ? reconciliationError.message : "Unknown error",
        });
      }
      throw new Error("payment_pending_reconciliation_error");
    }
  }

  async collectCard(): Promise<Payment> {
    throw new Error("M-Pesa does not support card collection or delayed card charges");
  }

  async chargeCard(): Promise<Payment> {
    throw new Error("M-Pesa does not support card collection or delayed card charges");
  }

  async update(paymentId: Payment["id"], data: Partial<Prisma.PaymentUncheckedCreateInput>): Promise<Payment> {
    return prisma.payment.update({ where: { id: paymentId }, data });
  }

  async refund(_paymentId: Payment["id"]): Promise<Payment | null> {
    throw new Error("M-Pesa refunds must be processed and reconciled separately; automatic refunds are not supported");
  }

  async getPaymentPaidStatus(): Promise<string> {
    throw new Error("M-Pesa payment status is confirmed by the Daraja callback");
  }

  async getPaymentDetails(): Promise<Payment> {
    throw new Error("M-Pesa payment details are retrieved from the payment record");
  }

  async afterPayment(
    event: CalendarEvent,
    booking: {
      user: { email: string | null; name: string | null; timeZone: string } | null;
      id: number;
      startTime: { toISOString: () => string };
      uid: string;
    },
    paymentData: Payment,
    _eventTypeMetadata?: EventTypeMetadata
  ): Promise<void> {
    const delayMinutes = Number(process.env.AWAITING_PAYMENT_EMAIL_DELAY_MINUTES) || 15;
    await tasker.create(
      "sendAwaitingPaymentEmail",
      { bookingId: booking.id, paymentId: paymentData.id, attendeeSeatId: event.attendeeSeatId || null },
      { scheduledAt: dayjs().add(delayMinutes, "minutes").toDate(), referenceUid: booking.uid }
    );
  }

  async deletePayment(_paymentId: Payment["id"]): Promise<boolean> {
    // Daraja STK Push has no safe cancellation operation. Keep the record pending
    // until its callback arrives rather than pretending the remote request stopped.
    return false;
  }

  isSetupAlready(): boolean {
    return Boolean(
      process.env.DARAJA_CONSUMER_KEY &&
        process.env.DARAJA_CONSUMER_SECRET &&
        process.env.DARAJA_CALLBACK_URL &&
        process.env.DARAJA_CALLBACK_SECRET &&
        process.env.MPESA_CREDENTIALS_ENCRYPTION_KEY
    );
  }
}

export function BuildPaymentService(credentials: { key: Prisma.JsonValue }): IAbstractPaymentService {
  return new PaymentService(credentials);
}
