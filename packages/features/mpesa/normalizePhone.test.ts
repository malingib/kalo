import { describe, expect, it } from "vitest";
import { normalizeKenyanPhone } from "./normalizePhone";

describe("normalizeKenyanPhone", () => {
  it("normalizes standard Safaricom/Airtel 07 numbers", () => {
    expect(normalizeKenyanPhone("0712345678")).toBe("254712345678");
  });

  it("normalizes 01 numbers", () => {
    expect(normalizeKenyanPhone("0112345678")).toBe("254112345678");
  });

  it("normalizes numbers with +254 country code", () => {
    expect(normalizeKenyanPhone("+254712345678")).toBe("254712345678");
  });

  it("handles numbers with spaces or dashes", () => {
    expect(normalizeKenyanPhone("0712-345-678")).toBe("254712345678");
  });

  it("returns null for invalid or short numbers", () => {
    expect(normalizeKenyanPhone("12345")).toBeNull();
    expect(normalizeKenyanPhone("0912345678")).toBeNull();
  });
});
