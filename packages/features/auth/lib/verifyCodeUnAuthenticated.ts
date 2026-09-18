import { createHash } from "node:crypto";

import { checkRateLimitAndThrowError } from "@kalo/lib/checkRateLimitAndThrowError";
import { hashEmail } from "@kalo/lib/server/PiiHasher";
import { totpRawCheck } from "@kalo/lib/totp";

export const verifyCodeUnAuthenticated = async (email: string, code: string) => {
  if (!email || !code) {
    throw new Error("Email and code are required");
  }

  await checkRateLimitAndThrowError({
    rateLimitingType: "core",
    identifier: `emailVerifyCode.${hashEmail(email)}`,
  });

  const secret = createHash("md5")
    .update(email + (process.env.CALENDSO_ENCRYPTION_KEY || ""))
    .digest("hex");

  const isValidToken = totpRawCheck(code, secret, { step: 900 });

  if (!isValidToken) {
    throw new Error("Invalid verification code");
  }

  return true;
};
