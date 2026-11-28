import { randomBytes } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { decryptMpesaSecret, encryptMpesaSecret } from "./credentials";

describe("M-Pesa credential encryption", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("encrypts and decrypts a passkey without storing plaintext", () => {
    vi.stubEnv("MPESA_CREDENTIALS_ENCRYPTION_KEY", randomBytes(32).toString("base64"));

    const plaintext = "vendor-passkey-secret";
    const encrypted = encryptMpesaSecret(plaintext);

    expect(encrypted).not.toContain(plaintext);
    expect(encrypted.startsWith("enc:v1:")).toBe(true);
    expect(decryptMpesaSecret(encrypted)).toEqual({ plaintext, encrypted: true });
  });

  it("identifies legacy plaintext so callers can migrate it", () => {
    expect(decryptMpesaSecret("legacy-passkey")).toEqual({
      plaintext: "legacy-passkey",
      encrypted: false,
    });
  });

  it("rejects encrypted values when the key is missing", () => {
    vi.stubEnv("MPESA_CREDENTIALS_ENCRYPTION_KEY", randomBytes(32).toString("base64"));
    const encrypted = encryptMpesaSecret("passkey");
    vi.stubEnv("MPESA_CREDENTIALS_ENCRYPTION_KEY", "");

    expect(() => decryptMpesaSecret(encrypted)).toThrow(
      "MPESA_CREDENTIALS_ENCRYPTION_KEY is not configured"
    );
  });

  it("rejects tampered ciphertext", () => {
    vi.stubEnv("MPESA_CREDENTIALS_ENCRYPTION_KEY", randomBytes(32).toString("base64"));
    const encrypted = encryptMpesaSecret("passkey");
    const tampered = encrypted.slice(0, -2) + "AA";

    expect(() => decryptMpesaSecret(tampered)).toThrow();
  });
});
