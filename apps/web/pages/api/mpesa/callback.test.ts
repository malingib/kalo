import { BookingStatus } from "@kalo/prisma/enums";
import type { NextApiRequest, NextApiResponse } from "next";
import { beforeEach, describe, expect, it, vi } from "vitest";

type Mock = ReturnType<typeof vi.fn>;

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    mPesaTransaction: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    booking: {
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    receipt: {
      count: vi.fn(),
      create: vi.fn(),
    },
    alert: {
      create: vi.fn(),
    },
    whatsAppMessageLog: {
      create: vi.fn(),
    },
    whatsAppSession: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@kalo/prisma", () => ({ default: mockPrisma, prisma: mockPrisma }));

import handler from "./callback";

const PENDING_TX = {
  id: "tx-1",
  bookingUid: "booking-1",
  phoneNumber: "254712345678",
  amount: 500,
  checkoutRequestId: "ws_CO_123",
  merchantRequestId: "m-1",
  status: "PENDING",
};

function createReq(body: unknown, query: Record<string, unknown> = {}): NextApiRequest {
  return { method: "POST", body, query } as unknown as NextApiRequest;
}

function createRes() {
  const res = {} as NextApiResponse & { _status?: number; _json?: unknown };
  res.status = vi.fn((code: number) => {
    res._status = code;
    return res;
  }) as unknown as NextApiResponse["status"];
  res.json = vi.fn((body: unknown) => {
    res._json = body;
    return res;
  }) as unknown as NextApiResponse["json"];
  return res;
}

describe("M-Pesa callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    (mockPrisma.$transaction as Mock).mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn(mockPrisma)
    );
    (mockPrisma.mPesaTransaction.findFirst as Mock).mockResolvedValue(PENDING_TX);
    (mockPrisma.mPesaTransaction.update as Mock).mockResolvedValue(PENDING_TX);
    (mockPrisma.booking.updateMany as Mock).mockResolvedValue({ count: 1 });
    (mockPrisma.booking.findFirst as Mock).mockResolvedValue({
      uid: "booking-1",
      title: "Executive Haircut",
      userId: 42,
      startTime: new Date(),
    });
    (mockPrisma.receipt.count as Mock).mockResolvedValue(0);
    (mockPrisma.receipt.create as Mock).mockResolvedValue({ id: "r-1", receiptNumber: "RCP-20260806-0001" });
    (mockPrisma.alert.create as Mock).mockResolvedValue({ id: "a-1" });
    (mockPrisma.whatsAppMessageLog.create as Mock).mockResolvedValue({ id: "l-1" });
    (mockPrisma.whatsAppSession.findUnique as Mock).mockResolvedValue(null);
  });

  it("cancels a linked PENDING booking when the payment fails, idempotently", async () => {
    const res = createRes();
    await handler(
      createReq({
        Body: {
          stkCallback: {
            CheckoutRequestID: "ws_CO_123",
            ResultCode: 1032,
            ResultDesc: "Request cancelled by user",
          },
        },
      }),
      res
    );

    expect(res._status).toBe(200);
    // Only a still-PENDING reservation is cancelled — the status guard keeps
    // Daraja's callback retries idempotent and never touches confirmed
    // bookings.
    expect(mockPrisma.booking.updateMany).toHaveBeenCalledWith({
      where: { uid: "booking-1", status: BookingStatus.PENDING },
      data: { status: BookingStatus.CANCELLED },
    });
    // The success-path booking update must not run for a failed payment.
    expect(mockPrisma.booking.update).not.toHaveBeenCalled();
    // The first observation of the failure raises a BOOKING_CANCELLED alert so
    // the vendor sees the abandoned reservation in their dashboard.
    expect(mockPrisma.alert.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 42,
          type: "BOOKING_CANCELLED",
          channel: "IN_APP",
          metadata: expect.objectContaining({
            bookingUid: "booking-1",
            customerPhone: "254712345678",
            reason: "PAYMENT_FAILED",
          }),
        }),
      })
    );
    expect(mockPrisma.mPesaTransaction.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "FAILED" }) })
    );
  });

  it("marks the booking paid and promotes a PENDING reservation on success", async () => {
    (mockPrisma.booking.update as Mock).mockResolvedValue({
      uid: "booking-1",
      title: "Executive Haircut",
      userId: 42,
      status: BookingStatus.PENDING,
      user: null,
      attendees: [{ name: "Brian Otieno" }],
    });

    const res = createRes();
    await handler(
      createReq({
        Body: {
          stkCallback: {
            CheckoutRequestID: "ws_CO_123",
            ResultCode: 0,
            ResultDesc: "Success",
            CallbackMetadata: {
              Item: [
                { Name: "Amount", Value: 500 },
                { Name: "MpesaReceiptNumber", Value: "RCD9876543" },
                { Name: "PhoneNumber", Value: "254712345678" },
              ],
            },
          },
        },
      }),
      res
    );

    expect(res._status).toBe(200);
    expect(mockPrisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ paymentStatus: "DEPOSIT_PAID", paid: true }),
      })
    );
    // The still-pending reservation is promoted to confirmed.
    expect(mockPrisma.booking.update).toHaveBeenCalledWith({
      where: { uid: "booking-1" },
      data: { status: BookingStatus.ACCEPTED },
    });
    expect(mockPrisma.receipt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          bookingUid: "booking-1",
          customerPhone: "254712345678",
          // The receipt carries the attendee's name, not the service title.
          customerName: "Brian Otieno",
          mpesaReceiptNumber: "RCD9876543",
        }),
      })
    );
    expect(mockPrisma.mPesaTransaction.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "SUCCESS" }) })
    );
  });

  it("prefers the recorded transaction phone when the callback metadata phone differs", async () => {
    (mockPrisma.booking.update as Mock).mockResolvedValue({
      uid: "booking-1",
      title: "Executive Haircut",
      userId: 42,
      userPrimaryEmail: null,
      status: BookingStatus.PENDING,
      user: null,
    });

    const res = createRes();
    await handler(
      createReq({
        Body: {
          stkCallback: {
            CheckoutRequestID: "ws_CO_123",
            ResultCode: 0,
            ResultDesc: "Success",
            CallbackMetadata: {
              Item: [
                { Name: "Amount", Value: 500 },
                { Name: "MpesaReceiptNumber", Value: "RCD9876543" },
                { Name: "PhoneNumber", Value: "254799999999" },
              ],
            },
          },
        },
      }),
      res
    );

    // The receipt + session resolution must use the recorded phone, not the
    // mismatched callback phone.
    expect(mockPrisma.receipt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ customerPhone: "254712345678" }),
      })
    );
  });

  it("marks the WhatsApp session paymentFailed when the payment fails", async () => {
    (mockPrisma.whatsAppSession.findUnique as Mock).mockResolvedValue({
      sessionData: {
        customerPhone: "254712345678",
        vendorUserId: 42,
        state: "WAITING_MPESA_STK",
      },
    });
    (mockPrisma.whatsAppSession.upsert as Mock).mockResolvedValue({ id: "s1" });

    const res = createRes();
    await handler(
      createReq({
        Body: {
          stkCallback: {
            CheckoutRequestID: "ws_CO_123",
            ResultCode: 1032,
            ResultDesc: "Request cancelled by user",
          },
        },
      }),
      res
    );

    expect(res._status).toBe(200);
    // The reservation is cancelled and the customer's session is marked so the
    // bot tells them the truth instead of accepting a "done" as confirmation.
    expect(mockPrisma.booking.updateMany).toHaveBeenCalledWith({
      where: { uid: "booking-1", status: BookingStatus.PENDING },
      data: { status: BookingStatus.CANCELLED },
    });
    expect(mockPrisma.whatsAppSession.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          sessionData: expect.objectContaining({ paymentFailed: true, paymentVerified: false }),
        }),
      })
    );
  });

  it("does not re-mark the session or re-alert when a failed callback is retried (protects a rebooked conversation)", async () => {
    // A retried failure callback finds the transaction already FAILED and the
    // booking already CANCELLED — the cancel, alert and session mark ran
    // atomically on the first observation, so the retry must stay silent.
    (mockPrisma.mPesaTransaction.findFirst as Mock).mockResolvedValue({
      ...PENDING_TX,
      status: "FAILED",
    });
    (mockPrisma.booking.updateMany as Mock).mockResolvedValue({ count: 0 });
    (mockPrisma.whatsAppSession.findUnique as Mock).mockResolvedValue({
      sessionData: {
        customerPhone: "254712345678",
        vendorUserId: 42,
        state: "WAITING_MPESA_STK",
      },
    });

    const res = createRes();
    await handler(
      createReq({
        Body: {
          stkCallback: {
            CheckoutRequestID: "ws_CO_123",
            ResultCode: 1032,
            ResultDesc: "Request cancelled by user",
          },
        },
      }),
      res
    );

    expect(res._status).toBe(200);
    // The idempotent booking cancel still runs, but nothing was cancelled this
    // time — no duplicate alert, and the session is left untouched.
    expect(mockPrisma.booking.updateMany).toHaveBeenCalled();
    expect(mockPrisma.alert.create).not.toHaveBeenCalled();
    expect(mockPrisma.whatsAppSession.upsert).not.toHaveBeenCalled();
  });

  it("rejects callbacks that lack the configured secret", async () => {
    vi.stubEnv("DARAJA_CALLBACK_SECRET", "topsecret");

    const res = createRes();
    await handler(createReq({ Body: { stkCallback: {} } }), res);

    expect(res._status).toBe(401);
    expect(mockPrisma.mPesaTransaction.findFirst).not.toHaveBeenCalled();
  });

  it("accepts callbacks carrying the configured secret", async () => {
    vi.stubEnv("DARAJA_CALLBACK_SECRET", "topsecret");
    (mockPrisma.booking.update as Mock).mockResolvedValue({
      uid: "booking-1",
      title: "Executive Haircut",
      userId: 42,
      userPrimaryEmail: null,
      status: BookingStatus.PENDING,
      user: null,
    });

    const res = createRes();
    await handler(
      createReq(
        {
          Body: {
            stkCallback: {
              CheckoutRequestID: "ws_CO_123",
              ResultCode: 0,
              ResultDesc: "Success",
              CallbackMetadata: { Item: [{ Name: "Amount", Value: 500 }] },
            },
          },
        },
        { secret: "topsecret" }
      ),
      res
    );

    expect(res._status).toBe(200);
    expect(mockPrisma.booking.update).toHaveBeenCalled();
  });
});
