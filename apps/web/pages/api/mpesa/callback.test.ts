import { BookingStatus } from "@kalo/prisma/enums";
import type { NextApiRequest, NextApiResponse } from "next";
import { beforeEach, describe, expect, it, vi } from "vitest";

type Mock = ReturnType<typeof vi.fn>;

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    mPesaTransaction: {
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    payment: {
      update: vi.fn(),
    },
    mPesaSubscription: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    membership: {
      findMany: vi.fn(),
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
      createMany: vi.fn(),
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
  source: "whatsapp-bot",
  status: "PENDING",
};

function createReq(
  body: unknown,
  query: Record<string, unknown> = { secret: "test-secret" }
): NextApiRequest {
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

describe("M-Pesa callback", () => {  it("rejects callbacks without a checkout request ID before querying transactions", async () => {
    const res = createRes();
    await handler(
      createReq({
        Body: {
          stkCallback: {
            ResultCode: 0,
            ResultDesc: "Success",
          },
        },
      }),
      res
    );

    expect(res._status).toBe(400);
    expect(mockPrisma.mPesaTransaction.findFirst).not.toHaveBeenCalled();
  });

  it("does not repeat side-effects for duplicate successful callbacks", async () => {
    (mockPrisma.mPesaTransaction.findFirst as Mock).mockResolvedValue({
      ...PENDING_TX,
      status: "SUCCESS",
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
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(mockPrisma.receipt.create).not.toHaveBeenCalled();
    expect(mockPrisma.booking.update).not.toHaveBeenCalled();
  });

  it("flags a conflicting callback after a terminal success for reconciliation", async () => {
    (mockPrisma.mPesaTransaction.findFirst as Mock).mockResolvedValue({
      ...PENDING_TX,
      status: "SUCCESS",
    });

    const res = createRes();
    await handler(
      createReq({
        Body: {
          stkCallback: {
            CheckoutRequestID: "ws_CO_123",
            ResultCode: 1032,
            ResultDesc: "Request cancelled",
          },
        },
      }),
      res
    );

    expect(res._status).toBe(200);
    expect(mockPrisma.mPesaTransaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "RECONCILIATION_REQUIRED" }),
      })
    );
  });


  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("DARAJA_CALLBACK_SECRET", "test-secret");
    (mockPrisma.$transaction as Mock).mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn(mockPrisma)
    );
    (mockPrisma.mPesaTransaction.findFirst as Mock).mockResolvedValue(PENDING_TX);
    (mockPrisma.mPesaTransaction.update as Mock).mockResolvedValue(PENDING_TX);
    (mockPrisma.mPesaTransaction.updateMany as Mock).mockResolvedValue({ count: 1 });
    (mockPrisma.payment.update as Mock).mockResolvedValue({ id: 99, success: true });
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
    (mockPrisma.alert.createMany as Mock).mockResolvedValue({ count: 1 });
    (mockPrisma.mPesaSubscription.findUnique as Mock).mockResolvedValue(null);
    (mockPrisma.mPesaSubscription.updateMany as Mock).mockResolvedValue({ count: 1 });
    (mockPrisma.membership.findMany as Mock).mockResolvedValue([]);
    (mockPrisma.whatsAppMessageLog.create as Mock).mockResolvedValue({ id: "l-1" });
    (mockPrisma.whatsAppSession.findUnique as Mock).mockResolvedValue(null);
  });

  it("marks the linked KALO payment successful only after a verified Daraja callback", async () => {
    (mockPrisma.mPesaTransaction.findFirst as Mock).mockResolvedValue({
      ...PENDING_TX,
      source: "booking-payment",
      paymentId: 99,
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
    expect(mockPrisma.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 99 },
        data: expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            provider: "mpesa",
            status: "SUCCESS",
            mpesaReceiptNumber: "RCD9876543",
          }),
        }),
      })
    );
  });

  it("marks a first-party booking payment paid only after verified Daraja metadata", async () => {
    (mockPrisma.mPesaTransaction.findFirst as Mock).mockResolvedValue({
      ...PENDING_TX,
      source: "booking-payment",
      paymentId: 123,
    });
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
    expect(mockPrisma.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 123 },
        data: expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            provider: "mpesa",
            status: "SUCCESS",
            checkoutRequestId: "ws_CO_123",
            mpesaReceiptNumber: "RCD9876543",
          }),
        }),
      })
    );
    expect(mockPrisma.booking.update).toHaveBeenCalled();
  });

  it("requires exact callback amount before confirming a booking payment", async () => {
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
                { Name: "Amount", Value: 499 },
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
    expect(mockPrisma.booking.update).not.toHaveBeenCalled();
    expect(mockPrisma.receipt.create).not.toHaveBeenCalled();
    expect(mockPrisma.mPesaTransaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "RECONCILIATION_REQUIRED" }),
      })
    );
  });

  it("moves a subscription to reconciliation when callback metadata does not match", async () => {
    (mockPrisma.mPesaTransaction.findFirst as Mock).mockResolvedValue({
      ...PENDING_TX,
      source: "subscription-payment",
      bookingUid: null,
      subscriptionId: "sub-1",
    });
    (mockPrisma.mPesaSubscription.findUnique as Mock).mockResolvedValue({
      id: "sub-1",
      userId: 42,
      teamId: null,
      subscriptionType: "TEAM",
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
                { Name: "Amount", Value: 499 },
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
    expect(mockPrisma.mPesaSubscription.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "sub-1" }),
        data: { status: "RECONCILIATION_REQUIRED" },
      })
    );
    expect(mockPrisma.alert.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            userId: 42,
            title: "M-Pesa subscription payment needs verification",
          }),
        ],
      })
    );
  });

  it("does not run WhatsApp side-effects for a generic M-Pesa transaction", async () => {
    (mockPrisma.mPesaTransaction.findFirst as Mock).mockResolvedValue({
      ...PENDING_TX,
      source: "platform",
      bookingUid: null,
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
    expect(mockPrisma.whatsAppMessageLog.create).not.toHaveBeenCalled();
    expect(mockPrisma.whatsAppSession.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.whatsAppSession.upsert).not.toHaveBeenCalled();
    expect(mockPrisma.mPesaTransaction.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "SUCCESS" }) })
    );
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

    // A callback phone that differs from the original STK destination is
    // not accepted as proof of payment; do not issue a receipt or confirm.
    expect(res._status).toBe(200);
    expect(mockPrisma.receipt.create).not.toHaveBeenCalled();
    expect(mockPrisma.booking.update).not.toHaveBeenCalled();
    expect(mockPrisma.mPesaTransaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "RECONCILIATION_REQUIRED" }),
      })
    );
    expect(mockPrisma.alert.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 42,
          type: "PAYMENT_RECONCILIATION_REQUIRED",
          channel: "IN_APP",
          metadata: expect.objectContaining({ bookingUid: "booking-1", checkoutRequestId: "ws_CO_123" }),
        }),
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
    await handler(createReq({ Body: { stkCallback: {} } }, {}), res);

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
              CallbackMetadata: {
                Item: [
                  { Name: "Amount", Value: 500 },
                  { Name: "MpesaReceiptNumber", Value: "RCD9876543" },
                  { Name: "PhoneNumber", Value: "254712345678" },
                ],
              },
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
