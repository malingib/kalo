import { afterEach, describe, expect, it, vi } from "vitest";
import { getWorkspaceSubscriptionAmount } from "./subscriptionService";
import { normalizeKenyanPhone } from "./normalizePhone";

describe("M-Pesa subscription input requirements", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("normalizes Kenyan mobile numbers before an STK request", () => {
    expect(normalizeKenyanPhone("0712345678")).toBe("254712345678");
    expect(normalizeKenyanPhone("+254112345678")).toBe("254112345678");
  });

  it("rejects non-Kenyan and malformed phone numbers", () => {
    expect(normalizeKenyanPhone("123456")).toBeNull();
    expect(normalizeKenyanPhone("+15551234567")).toBeNull();
  });

  it("resolves team and organization prices from server configuration", () => {
    vi.stubEnv(
      "MPESA_SUBSCRIPTION_PLANS_JSON",
      JSON.stringify({
        TEAM: { PRO: { MONTHLY: 1500, ANNUALLY: 15000 } },
        ORGANIZATION: { BUSINESS: { MONTHLY: 5000, ANNUALLY: 50000 } },
      })
    );

    expect(getWorkspaceSubscriptionAmount("TEAM", "PRO", "MONTHLY")).toBe(1500);
    expect(getWorkspaceSubscriptionAmount("ORGANIZATION", "BUSINESS", "ANNUALLY")).toBe(50000);
  });

  it("does not accept a client-invented or unconfigured plan price", () => {
    vi.stubEnv("MPESA_SUBSCRIPTION_PLANS_JSON", JSON.stringify({ TEAM: { PRO: { MONTHLY: 1500 } } }));
    expect(() => getWorkspaceSubscriptionAmount("TEAM", "PRO", "ANNUALLY")).toThrow(
      "The requested M-Pesa subscription plan is not configured"
    );
  });

  it("rejects malformed server-side plan configuration", () => {
    vi.stubEnv("MPESA_SUBSCRIPTION_PLANS_JSON", "not-json");
    expect(() => getWorkspaceSubscriptionAmount("TEAM", "PRO", "MONTHLY")).toThrow(
      "MPESA_SUBSCRIPTION_PLANS_JSON must contain valid server-side plan pricing"
    );
  });
});
