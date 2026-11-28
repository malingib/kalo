import prismaMock from "../__mocks__/prisma";

import "vitest-fetch-mock";

import { sendAwaitingPaymentEmailAndSMS } from "@kalo/emails/email-manager";
import logger from "@kalo/lib/logger";
import type { Booking, Payment, PaymentOption, Prisma } from "@kalo/prisma/client";
import type { CalendarEvent } from "@kalo/types/Calendar";
import type { IAbstractPaymentService } from "@kalo/types/PaymentService";

export function getMockPaymentService() {
  const paymentUid = "MOCK_PAYMENT_UID";
  const externalId = "mock_payment_external_id";

  class MockPaymentService implements IAbstractPaymentService {
    async create(
      payment: Pick<Prisma.PaymentUncheckedCreateInput, "amount" | "currency">,
      bookingId: Booking["id"],
      _userId: Booking["userId"],
      _username: string | null,
      _bookerName: string | null,
      paymentOption: PaymentOption,
      _bookerEmail: string,
      bookerPhoneNumber?: string | null
    ): Promise<Payment> {
      const paymentCreateData = {
        id: 1,
        uid: paymentUid,
        appId: "mpesa",
        bookingId,
        fee: 0,
        success: false,
        refunded: false,
        data: { provider: "mpesa", phoneNumber: bookerPhoneNumber ?? null, status: "PENDING" },
        externalId,
        paymentOption,
        amount: payment.amount,
        currency: payment.currency,
      };

      const paymentData = await prismaMock.payment.create({ data: paymentCreateData });
      logger.silly("Created mock M-Pesa payment", JSON.stringify({ paymentData }));

      const verifyPayment = await prismaMock.payment.findFirst({
        where: { externalId: paymentCreateData.externalId },
      });
      logger.silly("Verified payment exists", JSON.stringify({ verifyPayment }));

      return paymentData;
    }

    async collectCard(): Promise<Payment> {
      throw new Error("M-Pesa does not support card holds");
    }

    async chargeCard(): Promise<Payment> {
      throw new Error("M-Pesa does not support delayed card charges");
    }

    async update(paymentId: Payment["id"], data: Partial<Prisma.PaymentUncheckedCreateInput>) {
      return prismaMock.payment.update({ where: { id: paymentId }, data });
    }

    async refund(): Promise<Payment | null> {
      throw new Error("M-Pesa refunds require separate reconciliation");
    }

    async getPaymentPaidStatus(): Promise<string> {
      return "PENDING";
    }

    async getPaymentDetails(): Promise<Payment> {
      throw new Error("Use the payment record lookup in the test");
    }

    async afterPayment(
      event: CalendarEvent,
      _booking: {
        user: { email: string | null; name: string | null; timeZone: string } | null;
        id: number;
        startTime: { toISOString: () => string };
        uid: string;
      },
      paymentData: Payment
    ): Promise<void> {
      await sendAwaitingPaymentEmailAndSMS({
        ...event,
        paymentInfo: {
          link: "http://mock-payment.example.com/",
          paymentOption: paymentData.paymentOption || "ON_BOOKING",
          amount: paymentData.amount,
          currency: paymentData.currency,
        },
      });
    }

    async deletePayment(): Promise<boolean> {
      return false;
    }

    isSetupAlready(): boolean {
      return true;
    }
  }

  return { paymentUid, externalId, MockPaymentService };
}
