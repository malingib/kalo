import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockPrisma, mockInitiateStkPush, mockDecrypt, mockEncrypt, mockNormalizePhone, mockUncertain } = vi.hoisted(
  () => ({
    mockInitiateStkPush: vi.fn(),
    mockDecrypt: vi.fn(),
    mockEncrypt: vi.fn(),
    mockNormalizePhone: vi.fn(),
    mockUncertain: vi.fn(),
    mockPrisma: {
      booking: { findUnique: vi.fn() },
      payment: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
      mPesaTransaction: { create: vi.fn(), update: vi.fn() },
      user: { update: vi.fn() },
      alert: { create: vi.fn() },
      $transaction: vi.fn(),
    },
  })
);

vi.mock("@kalo/prisma", () => ({ default: mockPrisma, prisma: mockPrisma }));
vi.mock("@kalo/features/mpesa", () => ({
  DarajaClient: { initiateStkPush: mockInitiateStkPush },
  decryptMpesaSecret: mockDecrypt,
  encryptMpesaSecret: mockEncrypt,
  normalizeKenyanPhone: mockNormalizePhone,
  isDarajaStkOutcomeUncertain: mockUncertain,
}));
vi.mock("@kalo/lib/currencyConversions", () => ({
  convertFromSmallestToPresentableCurrencyUnit: (amount: number) => amount / 100,
}));

import { PaymentService } from "./PaymentService";

describe("native M-Pesa booking PaymentService", () => {
  const booking = {
    uid: "booking-uid",
    title: "Consultation",
    userId: 42,
    user: {
      mpesaShortcode: "123456",
      mpesaShortcodeType: "BUY_GOODS",
      mpesaTillNumber: "654321",
      mpesaPasskey: "legacy-plaintext-passkey",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("DARAJA_CONSUMER_KEY", "consumer-key");
    vi.stubEnv("DARAJA_CONSUMER_SECRET", "consumer-secret");
    vi.stubEnv("DARAJA_CALLBACK_URL", "https://kalo.example/api/mpesa/callback");
    vi.stubEnv("DARAJA_CALLBACK_SECRET", "callback-secret");
    vi.stubEnv("DARAJA_ENVIRONMENT", "sandbox");
    vi.stubEnv("MPESA_CREDENTIALS_ENCRYPTION_KEY", "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=");

    mockPrisma.$transaction.mockImplementation(async (operation: unknown) => {
      if (typeof operation === "function") return operation(mockPrisma);
      return Promise.all(operation as Promise<unknown>[]);
    });
    mockPrisma.booking.findUnique.mockResolvedValue(booking);
    mockPrisma.payment.findFirst.mockResolvedValue(null);
    mockPrisma.payment.create.mockResolvedValue({ id: 10, uid: "payment-uid", appId: "mpesa", success: false });
    mockPrisma.payment.update.mockResolvedValue({ id: 10, uid: "payment-uid", appId: "mpesa", success: false });
    mockPrisma.mPesaTransaction.create.mockResolvedValue({ id: "transaction-1" });
    mockPrisma.mPesaTransaction.update.mockResolvedValue({ id: "transaction-1", status: "PENDING" });
    mockPrisma.user.update.mockResolvedValue({ id: 42 });
    mockDecrypt.mockReturnValue({ plaintext: "legacy-plaintext-passkey", encrypted: false });
    mockEncrypt.mockReturnValue("enc:v1:encrypted-passkey");
    mockNormalizePhone.mockReturnValue("254712345678");
    mockUncertain.mockReturnValue(false);
    mockInitiateStkPush.mockResolvedValue({
      MerchantRequestID: "merchant-1",
      CheckoutRequestID: "checkout-1",
      ResponseDescription: "Success. Request accepted for processing",
      CustomerMessage: "Success. Request accepted for processing",
    });
  });

  it("creates a KES payment, encrypts a legacy passkey, and starts a Buy Goods STK push", async () => {
    const service = new PaymentService({ key: {} });
    const result = await service.create(
      { amount: 12500, currency: "KES" },
      99,
      42,
      "host",
      "Booker",
      "ON_BOOKING",
      "booker@example.com",
      "0712345678",
      "Consultation",
      "Consultation"
    );

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 42 },
      data: { mpesaPasskey: "enc:v1:encrypted-passkey" },
    });
    expect(mockInitiateStkPush).toHaveBeenCalledWith(
      expect.objectContaining({
        consumerKey: "consumer-key",
        consumerSecret: "consumer-secret",
        businessShortCode: "123456",
        transactionType: "CustomerBuyGoodsOnline",
        partyB: "654321",
        passkey: "legacy-plaintext-passkey",
        phoneNumber: "254712345678",
        amount: 125,
        accountReference: "booking-uid",
        callbackUrl: "https://kalo.example/api/mpesa/callback?secret=callback-secret",
        isSandbox: true,
      })
    );
    expect(mockPrisma.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          app: { connect: { slug: "mpesa" } },
          booking: { connect: { id: 99 } },
          amount: 12500,
          currency: "KES",
        }),
      })
    );
    expect(mockPrisma.mPesaTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          bookingUid: "booking-uid",
          phoneNumber: "254712345678",
          amount: 125,
          source: "booking-payment",
          status: "INITIATING",
        }),
      })
    );
    expect(result).toEqual(expect.objectContaining({ id: 10, appId: "mpesa" }));
  });

  it("rejects card holds and non-KES payments instead of silently changing the charge", async () => {
    const service = new PaymentService({ key: {} });
    await expect(
      service.create({ amount: 1000, currency: "KES" }, 99, 42, null, null, "HOLD", "booker@example.com")
    ).rejects.toThrow("M-Pesa supports payment on booking only");
    await expect(
      service.create(
        { amount: 1000, currency: "USD" },
        99,
        42,
        null,
        null,
        "ON_BOOKING",
        "booker@example.com",
        "0712345678"
      )
    ).rejects.toThrow("Native M-Pesa checkout requires KES");
    expect(mockInitiateStkPush).not.toHaveBeenCalled();
  });

  it("reuses an in-flight STK payment rather than sending a duplicate prompt", async () => {
    const existingPayment = {
      id: 11,
      uid: "existing-payment",
      appId: "mpesa",
      success: false,
      mpesaTransaction: { status: "PENDING" },
    };
    mockPrisma.payment.findFirst.mockResolvedValue(existingPayment);

    const service = new PaymentService({ key: {} });
    const result = await service.create(
      { amount: 12500, currency: "KES" },
      99,
      42,
      "host",
      "Booker",
      "ON_BOOKING",
      "booker@example.com",
      "0712345678"
    );

    expect(result).toBe(existingPayment);
    expect(mockInitiateStkPush).not.toHaveBeenCalled();
    expect(mockPrisma.payment.create).not.toHaveBeenCalled();
  });
});
