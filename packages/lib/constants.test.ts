import { afterEach, describe, expect, it, vi } from "vitest";

describe("branding defaults", () => {
  afterEach(() => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_APP_NAME;
    delete process.env.NEXT_PUBLIC_SUPPORT_MAIL_ADDRESS;
    delete process.env.NEXT_PUBLIC_COMPANY_NAME;
    delete process.env.NEXT_PUBLIC_SENDGRID_SENDER_NAME;
  });

  it("falls back to neutral Kalo branding when no env overrides are provided", async () => {
    const { APP_NAME, SUPPORT_MAIL_ADDRESS, COMPANY_NAME, SENDER_NAME } = await import("./constants");

    expect(APP_NAME).toBe("Kalo");
    expect(SUPPORT_MAIL_ADDRESS).toBe("support@kalo.local");
    expect(COMPANY_NAME).toBe("Kalo");
    expect(SENDER_NAME).toBe("Kalo");
  });
});
