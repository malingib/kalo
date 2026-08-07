import { beforeEach, describe, expect, it, vi } from "vitest";

type Mock = ReturnType<typeof vi.fn>;

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    booking: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    alert: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@calcom/prisma", () => ({ default: mockPrisma, prisma: mockPrisma }));
// The wrapper only adds error handling — test the handler directly.
vi.mock("app/api/defaultResponderForAppDir", () => ({
  defaultResponderForAppDir: (fn: (...args: unknown[]) => unknown) => fn,
}));

import { NextRequest, type NextResponse } from "next/server";
import { POST } from "./route";

// The App Router invokes the route with (req, { params }); the identity mock
// means the second argument is unused, so tests call it as a single-arg handler.
const post = POST as unknown as (req: NextRequest) => Promise<NextResponse>;

const STALE_BOOKING = {
  uid: "booking-1",
  title: "Executive Haircut",
  userId: 42,
  attendees: [{ name: "Brian Otieno", phoneNumber: "254712345678" }],
};

function cronRequest(authorization?: string, apiKey?: string): NextRequest {
  const url = new URL("https://cal.local/api/cron/cancelStaleWhatsappReservations");
  if (apiKey) url.searchParams.set("apiKey", apiKey);
  const headers: Record<string, string> = {};
  if (authorization) headers.authorization = authorization;
  return new NextRequest(url, { method: "POST", headers });
}

describe("cancelStaleWhatsappReservations cron", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("CRON_API_KEY", "cron-secret");
    (mockPrisma.$transaction as Mock).mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn(mockPrisma)
    );
  });

  it("rejects requests without the cron API key", async () => {
    const res = await post(cronRequest());

    expect(res.status).toBe(401);
    expect(mockPrisma.booking.findMany).not.toHaveBeenCalled();
  });

  it("accepts the cron API key passed as a query parameter", async () => {
    (mockPrisma.booking.findMany as Mock).mockResolvedValue([]);

    const res = await post(cronRequest(undefined, "cron-secret"));

    expect(res.status).toBe(200);
    expect(mockPrisma.booking.findMany).toHaveBeenCalled();
  });

  it("cancels stale WhatsApp reservations and raises a BOOKING_CANCELLED alert per booking", async () => {
    (mockPrisma.booking.findMany as Mock).mockResolvedValue([STALE_BOOKING]);
    (mockPrisma.booking.updateMany as Mock).mockResolvedValue({ count: 1 });
    (mockPrisma.alert.create as Mock).mockResolvedValue({ id: "a-1" });

    const res = await post(cronRequest("cron-secret"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ cancelled: 1 });
    // Only bot-tagged, still-unpaid PENDING bookings past the TTL are matched.
    expect(mockPrisma.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "PENDING",
          paymentStatus: "UNPAID",
          metadata: { path: ["whatsappBooking"], equals: true },
        }),
      })
    );
    expect(mockPrisma.booking.updateMany).toHaveBeenCalledWith({
      where: { uid: "booking-1", status: "PENDING", paymentStatus: "UNPAID" },
      data: { status: "CANCELLED" },
    });
    expect(mockPrisma.alert.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 42,
          type: "BOOKING_CANCELLED",
          channel: "IN_APP",
          title: "❌ Booking Cancelled — Executive Haircut",
          metadata: expect.objectContaining({ bookingUid: "booking-1", reason: "PAYMENT_TIMEOUT" }),
        }),
      })
    );
  });

  it("cancels without alerting when the booking has no vendor user", async () => {
    (mockPrisma.booking.findMany as Mock).mockResolvedValue([{ ...STALE_BOOKING, userId: null }]);
    (mockPrisma.booking.updateMany as Mock).mockResolvedValue({ count: 1 });

    const res = await post(cronRequest("cron-secret"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ cancelled: 1 });
    expect(mockPrisma.alert.create).not.toHaveBeenCalled();
  });

  it("does not re-alert a booking already cancelled by an overlapping run", async () => {
    (mockPrisma.booking.findMany as Mock).mockResolvedValue([STALE_BOOKING]);
    // Another cron run (or the failure callback) already cancelled it.
    (mockPrisma.booking.updateMany as Mock).mockResolvedValue({ count: 0 });

    const res = await post(cronRequest("cron-secret"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ cancelled: 0 });
    expect(mockPrisma.alert.create).not.toHaveBeenCalled();
  });
});
