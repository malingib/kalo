import type { Payment } from "@kalo/prisma/client";
import { describe, expect, it, vi } from "vitest";
import { processNoShowFeeOnCancellation } from "./processNoShowFeeOnCancellation";

vi.mock("@kalo/lib/logger", () => ({
  default: { getSubLogger: () => ({ info: vi.fn() }) },
}));

describe("processNoShowFeeOnCancellation", () => {
  it("never attempts an automatic delayed charge for legacy HOLD payments", async () => {
    const payment = {
      id: 1,
      uid: "legacy-hold",
      appId: "legacy-payment",
      bookingId: 1,
      amount: 5000,
      fee: 0,
      currency: "KES",
      success: false,
      refunded: false,
      data: {},
      externalId: "legacy",
      paymentOption: "HOLD",
    } as Payment;

    await expect(
      processNoShowFeeOnCancellation({
        booking: { uid: "booking-123" },
        payments: [payment],
      })
    ).resolves.toBeUndefined();
  });

  it("does nothing for ordinary upfront M-Pesa payments", async () => {
    const payment = {
      id: 2,
      uid: "mpesa-payment",
      appId: "mpesa",
      bookingId: 1,
      amount: 5000,
      fee: 0,
      currency: "KES",
      success: true,
      refunded: false,
      data: {},
      externalId: "checkout",
      paymentOption: "ON_BOOKING",
    } as Payment;

    await expect(
      processNoShowFeeOnCancellation({
        booking: { uid: "booking-123" },
        payments: [payment],
      })
    ).resolves.toBeUndefined();
  });
});
