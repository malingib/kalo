import type { PrismaClient } from "@calcom/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WhatsAppSessionRepository } from "../sessionStore";
import type { UserSessionContext } from "../types";

describe("WhatsAppSessionRepository", () => {
  let repository: WhatsAppSessionRepository;
  const mockPrisma = {
    whatsAppSession: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  } as unknown as PrismaClient;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new WhatsAppSessionRepository({ prismaClient: mockPrisma });
  });

  const session: UserSessionContext = {
    customerPhone: "254712345678",
    vendorUserId: 42,
    state: "WAITING_MPESA_STK",
    customerName: "John Kamau",
    depositAmount: 500,
    checkoutRequestId: "ws_CO_123456789",
  };

  it("returns null when no session exists for the phone", async () => {
    (mockPrisma.whatsAppSession.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await repository.getSession("254712345678");

    expect(result).toBeNull();
    expect(mockPrisma.whatsAppSession.findUnique).toHaveBeenCalledWith({
      where: { phone: "254712345678" },
      select: { sessionData: true },
    });
  });

  it("loads the session context from sessionData", async () => {
    (mockPrisma.whatsAppSession.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      sessionData: session,
    });

    const result = await repository.getSession("254712345678");

    expect(result).toEqual(session);
  });

  it("upserts the session context keyed by phone", async () => {
    (mockPrisma.whatsAppSession.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "sess-1" });

    await repository.saveSession("254712345678", session);

    expect(mockPrisma.whatsAppSession.upsert).toHaveBeenCalledWith({
      where: { phone: "254712345678" },
      create: {
        userId: 42,
        phone: "254712345678",
        sessionData: session,
        status: "CONNECTED",
      },
      update: {
        userId: 42,
        sessionData: session,
        status: "CONNECTED",
      },
    });
  });

  it("marks the payment verified and persists the merged context", async () => {
    (mockPrisma.whatsAppSession.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      sessionData: session,
    });
    (mockPrisma.whatsAppSession.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "sess-1" });

    const result = await repository.markPaymentVerified("254712345678", "RCD1234567");

    expect(result).toMatchObject({
      ...session,
      paymentVerified: true,
      mpesaReceiptCode: "RCD1234567",
    });
    expect(mockPrisma.whatsAppSession.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          sessionData: expect.objectContaining({
            paymentVerified: true,
            paymentFailed: false,
            mpesaReceiptCode: "RCD1234567",
          }),
        }),
      })
    );
  });

  it("markPaymentVerified clears a stale paymentFailed flag", async () => {
    (mockPrisma.whatsAppSession.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      sessionData: { ...session, paymentFailed: true },
    });
    (mockPrisma.whatsAppSession.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "sess-1" });

    const result = await repository.markPaymentVerified("254712345678");

    expect(result?.paymentVerified).toBe(true);
    expect(result?.paymentFailed).toBe(false);
  });

  it("marks the payment failed and clears paymentVerified", async () => {
    (mockPrisma.whatsAppSession.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      sessionData: { ...session, paymentVerified: true },
    });
    (mockPrisma.whatsAppSession.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "sess-1" });

    const result = await repository.markPaymentFailed("254712345678");

    expect(result).toMatchObject({
      ...session,
      paymentVerified: false,
      paymentFailed: true,
    });
    expect(mockPrisma.whatsAppSession.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          sessionData: expect.objectContaining({
            paymentVerified: false,
            paymentFailed: true,
          }),
        }),
      })
    );
  });

  it("markPaymentFailed returns null when no session exists", async () => {
    (mockPrisma.whatsAppSession.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await repository.markPaymentFailed("254712345678");

    expect(result).toBeNull();
    expect(mockPrisma.whatsAppSession.upsert).not.toHaveBeenCalled();
  });

  it("markPaymentVerified returns null when no session exists", async () => {
    (mockPrisma.whatsAppSession.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await repository.markPaymentVerified("254712345678", "RCD1234567");

    expect(result).toBeNull();
    expect(mockPrisma.whatsAppSession.upsert).not.toHaveBeenCalled();
  });
});
