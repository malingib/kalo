import type { PrismaClient } from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MPesaStkPushResponse } from "../../mpesa/darajaClient";
import { WhatsAppSessionRepository } from "../sessionStore";
import type { UserSessionContext } from "../types";
import { WhatsAppWebhookService } from "../webhookService";

describe("WhatsAppWebhookService", () => {
  const mockPrisma = {
    user: {
      findUnique: vi.fn(),
    },
    mPesaTransaction: {
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    booking: {
      create: vi.fn(),
    },
    alert: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  } as unknown as PrismaClient;

  let sessionRepository: WhatsAppSessionRepository;
  const mockInitiateStkPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("WHATSAPP_DEFAULT_VENDOR_USER_ID", "42");
    vi.stubEnv("DARAJA_CONSUMER_KEY", "ck");
    vi.stubEnv("DARAJA_CONSUMER_SECRET", "cs");
    vi.stubEnv("DARAJA_CALLBACK_URL", "https://example.com/api/mpesa/callback");
    vi.stubEnv("DARAJA_ENVIRONMENT", "sandbox");

    // Defaults for the booking/transaction mocks; individual tests that walk a
    // payment flow assert on the arguments these were called with. The
    // $transaction mock runs the callback against the same mock client so the
    // STK path's atomic booking+transaction write can be exercised.
    (mockPrisma.booking.create as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      uid: "booking-1",
    });
    (mockPrisma.alert.create as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "a-1" });
    (mockPrisma.mPesaTransaction.updateMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      count: 1,
    });
    (mockPrisma.$transaction as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn(mockPrisma)
    );

    const mockSessionRepo = {
      whatsAppSession: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
    } as unknown as PrismaClient;
    sessionRepository = new WhatsAppSessionRepository({ prismaClient: mockSessionRepo });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const vendor = {
    id: 42,
    name: "BarberHub Nairobi",
    username: "barberhub",
    mpesaPaybill: "522522",
    mpesaTillNumber: "892341",
    mpesaShortcode: "174379",
    mpesaPasskey: "passkey-123",
    eventTypes: [
      { id: 101, title: "Executive Haircut", price: 1500, depositAmount: 500, length: 45 },
      { id: 102, title: "Beard Trim", price: 800, depositAmount: 0, length: 30 },
    ],
  };

  /** In-memory session store so a conversation persists across messages. */
  const createInMemorySessionRepo = (): {
    repo: WhatsAppSessionRepository;
    sessionsByPhone: Map<string, UserSessionContext>;
  } => {
    const sessionsByPhone = new Map<string, UserSessionContext>();
    const mockSessionRepo = {
      whatsAppSession: {
        findUnique: vi.fn(({ where }: { where: { phone: string } }) =>
          Promise.resolve(
            sessionsByPhone.has(where.phone) ? { sessionData: sessionsByPhone.get(where.phone) } : null
          )
        ),
        upsert: vi.fn(
          ({
            where,
            create,
            update,
          }: {
            where: { phone: string };
            create: { sessionData: UserSessionContext };
            update: { sessionData: UserSessionContext };
          }) => {
            sessionsByPhone.set(where.phone, update.sessionData ?? create.sessionData);
            return Promise.resolve({ id: "s1" });
          }
        ),
      },
    } as unknown as PrismaClient;
    return { repo: new WhatsAppSessionRepository({ prismaClient: mockSessionRepo }), sessionsByPhone };
  };

  it("starts a new conversation, persists context, and replies with the main menu", async () => {
    (mockPrisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(vendor);
    const mockSessionRepo = {
      whatsAppSession: {
        findUnique: vi.fn().mockResolvedValue(null),
        upsert: vi.fn().mockResolvedValue({ id: "s1" }),
      },
    } as unknown as PrismaClient;
    const repo = new WhatsAppSessionRepository({ prismaClient: mockSessionRepo });

    const service = new WhatsAppWebhookService({
      prismaClient: mockPrisma,
      sessionRepository: repo,
      initiateStkPush: mockInitiateStkPush,
    });

    const result = await service.handleMessage({ from: "254712345678", body: "Hi" });

    expect(result.replyText).toContain("Welcome to BarberHub Nairobi");
    expect(result.state).toBe("MAIN_MENU");
    expect(result.stkPushTriggered).toBe(false);
    expect(mockInitiateStkPush).not.toHaveBeenCalled();

    expect(mockSessionRepo.whatsAppSession.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          userId: 42,
          phone: "254712345678",
        }),
      })
    );
  });

  it("fires the STK push, creates a reservation and links the transaction when the customer completes the deposit flow", async () => {
    (mockPrisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(vendor);
    (mockPrisma.mPesaTransaction.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "tx-1" });

    const { repo, sessionsByPhone } = createInMemorySessionRepo();

    mockInitiateStkPush.mockResolvedValue({
      MerchantRequestID: "m-1",
      CheckoutRequestID: "ws_CO_123",
      ResponseCode: "0",
      ResponseDescription: "Success",
      CustomerMessage: "Success",
    } satisfies MPesaStkPushResponse);

    const service = new WhatsAppWebhookService({
      prismaClient: mockPrisma,
      sessionRepository: repo,
      initiateStkPush: mockInitiateStkPush,
    });

    // Walk through the deposit flow: Hi -> services -> select 1 -> slot 2 -> name
    await service.handleMessage({ from: "254712345678", body: "Hi" });
    await service.handleMessage({ from: "254712345678", body: "1" });
    await service.handleMessage({ from: "254712345678", body: "1" });
    await service.handleMessage({ from: "254712345678", body: "2" });
    const result = await service.handleMessage({ from: "254712345678", body: "Brian Otieno" });

    expect(result.stkPushTriggered).toBe(true);
    expect(mockInitiateStkPush).toHaveBeenCalledWith(
      expect.objectContaining({
        businessShortCode: "174379",
        passkey: "passkey-123",
        phoneNumber: "254712345678",
        amount: 500,
        isSandbox: true,
      })
    );
    expect(mockPrisma.mPesaTransaction.create).toHaveBeenCalledWith({
      data: {
        phoneNumber: "254712345678",
        amount: 500,
        checkoutRequestId: "ws_CO_123",
        merchantRequestId: "m-1",
        status: "PENDING",
        // The transaction is recorded atomically with the booking, so the
        // Daraja callback always finds a linked bookingUid.
        bookingUid: "booking-1",
      },
    });
    // The checkoutRequestId must be persisted so the M-Pesa callback can resolve it.
    expect(sessionsByPhone.get("254712345678")?.checkoutRequestId).toBe("ws_CO_123");
    expect(result.state).toBe("WAITING_MPESA_STK");

    // The push materializes a PENDING reservation (unpaid) and links the
    // just-recorded transaction to it via bookingUid, so the M-Pesa callback
    // finds a linked booking when it confirms the payment.
    expect(mockPrisma.booking.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "Executive Haircut",
          eventTypeId: 101,
          userId: 42,
          status: BookingStatus.PENDING,
          paymentStatus: "UNPAID",
          paid: false,
          // Tagged so the stale-reservation cron can target bot bookings only.
          metadata: { whatsappBooking: true },
          attendees: expect.objectContaining({
            create: expect.objectContaining({
              name: "Brian Otieno",
              phoneNumber: "254712345678",
            }),
          }),
        }),
      })
    );
    expect(mockPrisma.mPesaTransaction.updateMany).toHaveBeenCalledWith({
      // Only still-pending transactions are linked, so a stale failed
      // transaction can't be attached to a fresh booking.
      where: { phoneNumber: "254712345678", bookingUid: null, status: "PENDING" },
      data: { bookingUid: "booking-1" },
    });
    // The booking uid is persisted so the flow never creates it twice.
    expect(sessionsByPhone.get("254712345678")?.bookingUid).toBe("booking-1");
    // A reservation is not a confirmed booking — no NEW_BOOKING alert yet; it
    // surfaces as PAYMENT_RECEIVED from the Daraja callback when paid.
    expect(mockPrisma.alert.create).not.toHaveBeenCalled();
  });

  it("embeds the Daraja callback secret in the push's callback URL when configured", async () => {
    vi.stubEnv("DARAJA_CALLBACK_SECRET", "s3cret-value");
    (mockPrisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(vendor);
    (mockPrisma.mPesaTransaction.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "tx-1" });

    const repo = createInMemorySessionRepo().repo;
    mockInitiateStkPush.mockResolvedValue({
      MerchantRequestID: "m-1",
      CheckoutRequestID: "ws_CO_123",
      ResponseCode: "0",
      ResponseDescription: "Success",
      CustomerMessage: "Success",
    } satisfies MPesaStkPushResponse);

    const service = new WhatsAppWebhookService({
      prismaClient: mockPrisma,
      sessionRepository: repo,
      initiateStkPush: mockInitiateStkPush,
    });

    // Walk to ENTERING_NAME with a deposit due, so the push fires.
    await service.handleMessage({ from: "254712345678", body: "Hi" });
    await service.handleMessage({ from: "254712345678", body: "1" });
    await service.handleMessage({ from: "254712345678", body: "1" });
    await service.handleMessage({ from: "254712345678", body: "2" });
    await service.handleMessage({ from: "254712345678", body: "Brian Otieno" });

    // The callback handler rejects pushes whose URL lacks the matching secret,
    // so the secret must travel with the registered callback URL.
    expect(mockInitiateStkPush).toHaveBeenCalledWith(
      expect.objectContaining({
        callbackUrl: "https://example.com/api/mpesa/callback?secret=s3cret-value",
      })
    );
  });

  it("replies honestly when the STK push fails and records no transaction", async () => {
    (mockPrisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(vendor);
    const mockSessionRepo = {
      whatsAppSession: {
        findUnique: vi.fn().mockResolvedValue(null),
        upsert: vi.fn().mockResolvedValue({ id: "s1" }),
      },
    } as unknown as PrismaClient;
    const repo = new WhatsAppSessionRepository({ prismaClient: mockSessionRepo });

    mockInitiateStkPush.mockRejectedValue(new Error("M-Pesa auth failed: 401"));

    const service = new WhatsAppWebhookService({
      prismaClient: mockPrisma,
      sessionRepository: repo,
      initiateStkPush: mockInitiateStkPush,
    });

    // Jump straight to ENTERING_NAME with a vendor + deposit set.
    const sessionWithDeposit = {
      customerPhone: "254712345678",
      vendorUserId: 42,
      state: "ENTERING_NAME",
      depositAmount: 500,
    } satisfies UserSessionContext;
    (mockSessionRepo.whatsAppSession.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      sessionData: sessionWithDeposit,
    });

    const result = await service.handleMessage({ from: "254712345678", body: "Brian Otieno" });

    expect(result.replyText).toContain("couldn't send the M-Pesa payment prompt");
    expect(result.stkPushTriggered).toBe(false);
    expect(mockPrisma.mPesaTransaction.create).not.toHaveBeenCalled();
  });

  it("records the transaction without a booking when the atomic reservation write fails after a successful push", async () => {
    (mockPrisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(vendor);
    (mockPrisma.mPesaTransaction.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "tx-1" });
    // Simulate the DB hiccuping between the push firing and the reservation
    // write: the transaction callback never runs.
    (mockPrisma.$transaction as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("connection reset")
    );

    const { repo, sessionsByPhone } = createInMemorySessionRepo();
    mockInitiateStkPush.mockResolvedValue({
      MerchantRequestID: "m-1",
      CheckoutRequestID: "ws_CO_123",
      ResponseCode: "0",
      ResponseDescription: "Success",
      CustomerMessage: "Success",
    } satisfies MPesaStkPushResponse);

    const service = new WhatsAppWebhookService({
      prismaClient: mockPrisma,
      sessionRepository: repo,
      initiateStkPush: mockInitiateStkPush,
    });

    await service.handleMessage({ from: "254712345678", body: "Hi" });
    await service.handleMessage({ from: "254712345678", body: "1" });
    await service.handleMessage({ from: "254712345678", body: "1" });
    await service.handleMessage({ from: "254712345678", body: "2" });
    // Must not throw: the customer's prompt already went out.
    const result = await service.handleMessage({ from: "254712345678", body: "Brian Otieno" });

    expect(result.stkPushTriggered).toBe(true);
    // The transaction is recorded best-effort WITHOUT a booking so the M-Pesa
    // callback can still resolve the payment server-side.
    expect(mockPrisma.mPesaTransaction.create).toHaveBeenCalledWith({
      data: {
        phoneNumber: "254712345678",
        amount: 500,
        checkoutRequestId: "ws_CO_123",
        merchantRequestId: "m-1",
        status: "PENDING",
      },
    });
    // No booking was created for this reservation.
    expect(sessionsByPhone.get("254712345678")?.bookingUid).toBeUndefined();
  });

  it("surfaces a server-side payment failure and never confirms on 'done'", async () => {
    (mockPrisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(vendor);

    // The Daraja callback marked the payment failed server-side (booking
    // cancelled); the customer replies "done" anyway. The bot must surface the
    // failure and offer a re-book, not confirm.
    const failedSession: UserSessionContext = {
      customerPhone: "254712345678",
      vendorUserId: 42,
      state: "WAITING_MPESA_STK",
      depositAmount: 500,
      customerName: "Brian Otieno",
      paymentFailed: true,
    };
    const mockSessionRepo = {
      whatsAppSession: {
        findUnique: vi.fn().mockResolvedValue({ sessionData: failedSession }),
        upsert: vi.fn().mockResolvedValue({ id: "s1" }),
      },
    } as unknown as PrismaClient;
    const repo = new WhatsAppSessionRepository({ prismaClient: mockSessionRepo });

    const service = new WhatsAppWebhookService({
      prismaClient: mockPrisma,
      sessionRepository: repo,
      initiateStkPush: mockInitiateStkPush,
    });

    const result = await service.handleMessage({ from: "254712345678", body: "done" });

    expect(result.replyText).toContain("Payment Not Completed");
    expect(result.replyText).not.toContain("Payment Confirmed");
    expect(result.state).toBe("MAIN_MENU");
    // No ACCEPTED booking (and thus no NEW_BOOKING alert) may be created for a
    // payment the callback said failed.
    expect(mockPrisma.booking.create).not.toHaveBeenCalled();
    expect(mockPrisma.alert.create).not.toHaveBeenCalled();
  });

  it("pulls a falsely-confirmed conversation back to WAITING_MPESA_STK when the failure callback lands mid-processing", async () => {
    (mockPrisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(vendor);

    // The webhook's initial read is stale (no failure yet); the failure
    // callback lands before the pre-save re-read, which has paymentFailed.
    const staleSession: UserSessionContext = {
      customerPhone: "254712345678",
      vendorUserId: 42,
      state: "WAITING_MPESA_STK",
      depositAmount: 500,
      customerName: "Brian Otieno",
    };
    const failedSession: UserSessionContext = { ...staleSession, paymentFailed: true };
    const mockSessionRepo = {
      whatsAppSession: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce({ sessionData: staleSession })
          .mockResolvedValueOnce({ sessionData: failedSession }),
        upsert: vi.fn().mockResolvedValue({ id: "s1" }),
      },
    } as unknown as PrismaClient;
    const repo = new WhatsAppSessionRepository({ prismaClient: mockSessionRepo });

    const service = new WhatsAppWebhookService({
      prismaClient: mockPrisma,
      sessionRepository: repo,
      initiateStkPush: mockInitiateStkPush,
    });

    // The machine runs on the stale read: "done" confirms (the reply can't be
    // unsent), but the persisted session must carry the failure and be pulled
    // back so the next message surfaces it instead of parking in a false
    // CONFIRMED state.
    const result = await service.handleMessage({ from: "254712345678", body: "done" });
    expect(result.replyText).toContain("Payment Confirmed");
    expect(result.state).toBe("WAITING_MPESA_STK");

    const upsert = mockSessionRepo.whatsAppSession.upsert as unknown as ReturnType<typeof vi.fn>;
    const updateData = upsert.mock.calls.at(-1)?.[0].update.sessionData as UserSessionContext;
    expect(updateData.paymentFailed).toBe(true);
    expect(updateData.state).toBe("WAITING_MPESA_STK");
  });

  it("does not clobber a paymentVerified flag set by the callback while processing", async () => {
    (mockPrisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(vendor);

    // The M-Pesa callback lands *between* the webhook's initial read and its
    // save: the first read is stale (no paymentVerified), the fresh re-read
    // before save has it. The state machine runs on the stale context, but the
    // persisted session must keep the server-side confirmation.
    const staleSession: UserSessionContext = {
      customerPhone: "254712345678",
      vendorUserId: 42,
      state: "WAITING_MPESA_STK",
      depositAmount: 500,
    };
    const verifiedSession: UserSessionContext = {
      ...staleSession,
      paymentVerified: true,
      mpesaReceiptCode: "RCD9876543",
    };
    const mockSessionRepo = {
      whatsAppSession: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce({ sessionData: staleSession })
          .mockResolvedValueOnce({ sessionData: verifiedSession }),
        upsert: vi.fn().mockResolvedValue({ id: "s1" }),
      },
    } as unknown as PrismaClient;
    const repo = new WhatsAppSessionRepository({ prismaClient: mockSessionRepo });

    const service = new WhatsAppWebhookService({
      prismaClient: mockPrisma,
      sessionRepository: repo,
      initiateStkPush: mockInitiateStkPush,
    });

    const result = await service.handleMessage({ from: "254712345678", body: "hello?" });

    const upsert = mockSessionRepo.whatsAppSession.upsert as unknown as ReturnType<typeof vi.fn>;
    const updateData = upsert.mock.calls.at(-1)?.[0].update.sessionData as UserSessionContext;
    // The callback's confirmation survives the webhook's full-column save.
    expect(updateData.paymentVerified).toBe(true);
    expect(updateData.mpesaReceiptCode).toBe("RCD9876543");
    // The machine ran on the stale context, so this message itself did not
    // short-circuit — but the persisted state stays WAITING_MPESA_STK so the
    // next message resolves to CONFIRMED.
    expect(result.state).toBe("WAITING_MPESA_STK");
    expect(result.replyText).toContain("complete the M-Pesa payment");
  });

  it("respects a deliberate paymentVerified reset when starting a new booking", async () => {
    (mockPrisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(vendor);

    const sessionWithVerification: UserSessionContext = {
      customerPhone: "254712345678",
      vendorUserId: 42,
      state: "ENTERING_NAME",
      depositAmount: 500,
      paymentVerified: true,
    };
    const mockSessionRepo = {
      whatsAppSession: {
        findUnique: vi.fn().mockResolvedValue({ sessionData: sessionWithVerification }),
        upsert: vi.fn().mockResolvedValue({ id: "s1" }),
      },
    } as unknown as PrismaClient;
    const repo = new WhatsAppSessionRepository({ prismaClient: mockSessionRepo });

    const service = new WhatsAppWebhookService({
      prismaClient: mockPrisma,
      sessionRepository: repo,
      initiateStkPush: mockInitiateStkPush,
    });

    // The state machine moves ENTERING_NAME -> WAITING_MPESA_STK and sets
    // paymentVerified: false for the fresh deposit; that reset must be kept.
    await service.handleMessage({ from: "254712345678", body: "Jane Wanjiru" });

    const upsert = mockSessionRepo.whatsAppSession.upsert as unknown as ReturnType<typeof vi.fn>;
    const updateData = upsert.mock.calls.at(-1)?.[0].update.sessionData as UserSessionContext;
    expect(updateData.paymentVerified).toBe(false);
  });

  it("throws when no default vendor is configured and no session exists", async () => {
    vi.stubEnv("WHATSAPP_DEFAULT_VENDOR_USER_ID", "");
    const service = new WhatsAppWebhookService({
      prismaClient: mockPrisma,
      sessionRepository,
      initiateStkPush: mockInitiateStkPush,
    });

    await expect(service.handleMessage({ from: "254712345678", body: "Hi" })).rejects.toThrow(
      /WHATSAPP_DEFAULT_VENDOR_USER_ID/
    );
  });

  it("uses the session's own vendor when a conversation already exists", async () => {
    const existingSession: UserSessionContext = {
      customerPhone: "254799999999",
      vendorUserId: 7,
      state: "MAIN_MENU",
    };
    const mockSessionRepo = {
      whatsAppSession: {
        findUnique: vi.fn().mockResolvedValue({ sessionData: existingSession }),
        upsert: vi.fn().mockResolvedValue({ id: "s1" }),
      },
    } as unknown as PrismaClient;
    const repo = new WhatsAppSessionRepository({ prismaClient: mockSessionRepo });
    (mockPrisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...vendor,
      id: 7,
    });

    const service = new WhatsAppWebhookService({
      prismaClient: mockPrisma,
      sessionRepository: repo,
      initiateStkPush: mockInitiateStkPush,
    });

    const result = await service.handleMessage({ from: "254799999999", body: "1" });

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 7 } }));
    expect(result.state).toBe("SELECTING_SERVICE");
  });

  it("creates a paid booking when the customer confirms with a manual M-Pesa receipt", async () => {
    // No Daraja shortcode/passkey → the machine falls back to the till/paybill
    // manual-receipt path instead of an STK push.
    (mockPrisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...vendor,
      mpesaShortcode: null,
      mpesaPasskey: null,
    });

    const { repo, sessionsByPhone } = createInMemorySessionRepo();
    const service = new WhatsAppWebhookService({
      prismaClient: mockPrisma,
      sessionRepository: repo,
      initiateStkPush: mockInitiateStkPush,
    });

    // Hi -> services -> select 1 (deposit 500) -> slot -> name -> receipt code
    await service.handleMessage({ from: "254712345678", body: "Hi" });
    await service.handleMessage({ from: "254712345678", body: "1" });
    await service.handleMessage({ from: "254712345678", body: "1" });
    await service.handleMessage({ from: "254712345678", body: "2" });
    await service.handleMessage({ from: "254712345678", body: "Brian Otieno" });
    const result = await service.handleMessage({ from: "254712345678", body: "RCD1234567" });

    expect(result.state).toBe("CONFIRMED");
    expect(mockInitiateStkPush).not.toHaveBeenCalled();
    expect(mockPrisma.mPesaTransaction.create).not.toHaveBeenCalled();
    // Confirmed without an STK push: the booking is created ACCEPTED + paid.
    expect(mockPrisma.booking.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "Executive Haircut",
          eventTypeId: 101,
          status: BookingStatus.ACCEPTED,
          paymentStatus: "DEPOSIT_PAID",
          paid: true,
        }),
      })
    );
    expect(sessionsByPhone.get("254712345678")?.bookingUid).toBe("booking-1");
    // The confirmed booking raises a NEW_BOOKING alert for the vendor.
    expect(mockPrisma.alert.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 42,
          type: "NEW_BOOKING",
          channel: "IN_APP",
          title: "📅 New Booking — Executive Haircut",
          body: expect.stringContaining("Brian Otieno"),
          metadata: expect.objectContaining({
            bookingUid: "booking-1",
            source: "whatsapp-bot",
            payment: "DEPOSIT_PAID",
          }),
        }),
      })
    );
  });

  it("creates a booking without payment when the selected service has no deposit", async () => {
    (mockPrisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(vendor);

    const { repo, sessionsByPhone } = createInMemorySessionRepo();
    const service = new WhatsAppWebhookService({
      prismaClient: mockPrisma,
      sessionRepository: repo,
      initiateStkPush: mockInitiateStkPush,
    });

    // Hi -> services -> select 2 (Beard Trim, no deposit) -> slot -> name
    await service.handleMessage({ from: "254712345678", body: "Hi" });
    await service.handleMessage({ from: "254712345678", body: "1" });
    await service.handleMessage({ from: "254712345678", body: "2" });
    await service.handleMessage({ from: "254712345678", body: "3" });
    const result = await service.handleMessage({ from: "254712345678", body: "Jane Wanjiru" });

    expect(result.state).toBe("CONFIRMED");
    expect(mockInitiateStkPush).not.toHaveBeenCalled();
    expect(mockPrisma.mPesaTransaction.create).not.toHaveBeenCalled();
    // No deposit due → booking created ACCEPTED but not paid.
    expect(mockPrisma.booking.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "Beard Trim",
          eventTypeId: 102,
          status: BookingStatus.ACCEPTED,
          paymentStatus: "UNPAID",
          paid: false,
        }),
      })
    );
    expect(sessionsByPhone.get("254712345678")?.bookingUid).toBe("booking-1");
    // No-deposit confirmations alert too, marked unpaid.
    expect(mockPrisma.alert.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "NEW_BOOKING",
          metadata: expect.objectContaining({ payment: "UNPAID" }),
        }),
      })
    );
  });
});
