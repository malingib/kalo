import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ENVELOPE_PREFIX = "enc:v1:";
const ALGORITHM = "aes-256-gcm";

function getEncryptionKey(): Buffer {
  const configured = process.env.MPESA_CREDENTIALS_ENCRYPTION_KEY;
  if (!configured) {
    throw new Error("MPESA_CREDENTIALS_ENCRYPTION_KEY is not configured");
  }

  const key = Buffer.from(configured, "base64");
  if (key.length !== 32) {
    throw new Error("MPESA_CREDENTIALS_ENCRYPTION_KEY must be a base64-encoded 32-byte key");
  }
  return key;
}

/** Encrypt a tenant M-Pesa secret using a versioned AES-256-GCM envelope. */
export function encryptMpesaSecret(plaintext: string): string {
  if (!plaintext) return plaintext;
  if (plaintext.startsWith(ENVELOPE_PREFIX)) return plaintext;

  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${ENVELOPE_PREFIX}${iv.toString("base64")}:${tag.toString("base64")}:${ciphertext.toString("base64")}`;
}

/** Decrypt a versioned tenant M-Pesa secret. Legacy plaintext is returned for lazy migration. */
export function decryptMpesaSecret(value: string): { plaintext: string; encrypted: boolean } {
  if (!value.startsWith(ENVELOPE_PREFIX)) {
    return { plaintext: value, encrypted: false };
  }

  const [ivEncoded, tagEncoded, ciphertextEncoded] = value.slice(ENVELOPE_PREFIX.length).split(":");
  if (!ivEncoded || !tagEncoded || !ciphertextEncoded) {
    throw new Error("Stored M-Pesa credential has an invalid encryption envelope");
  }

  const decipher = createDecipheriv(ALGORITHM, getEncryptionKey(), Buffer.from(ivEncoded, "base64"));
  decipher.setAuthTag(Buffer.from(tagEncoded, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextEncoded, "base64")),
    decipher.final(),
  ]).toString("utf8");

  return { plaintext, encrypted: true };
}
