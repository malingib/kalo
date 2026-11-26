import { describe, expect, it } from "vitest";
import { normalizeKenyanPhone } from "./normalizePhone";

describe("M-Pesa subscription input requirements", () => {
  it("normalizes Kenyan mobile numbers before an STK request", () => {
    expect(normalizeKenyanPhone("0712345678")).toBe("254712345678");
    expect(normalizeKenyanPhone("+254112345678")).toBe("254112345678");
  });

  it("rejects non-Kenyan and malformed phone numbers", () => {
    expect(normalizeKenyanPhone("123456")).toBeNull();
    expect(normalizeKenyanPhone("+15551234567")).toBeNull();
  });
});
