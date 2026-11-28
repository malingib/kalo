import type { z } from "zod";
import { z as zod } from "zod";

import { validateUrlForSSRFSync } from "../ssrfProtection";

const SSRF_ERROR = "URL is not allowed for security reasons";
const ssrfRefineOptions: { message: string } = { message: SSRF_ERROR };

// Validates URL for SSRF, allowing null/undefined/empty to pass through
const validateSsrfUrl = (url: string | null | undefined): boolean => {
  if (url == null || url === "") return true;
  return validateUrlForSSRFSync(url).isValid;
};

/**
 * Zod schema for validating user-provided URLs before server-side fetching
 * Applies synchronous SSRF checks only (no DNS resolution)
 */
export const ssrfSafeUrlSchema: z.ZodType<string, string> = zod
  .string()
  .refine((url) => validateUrlForSSRFSync(url).isValid, ssrfRefineOptions);

// Optional nullable variant for update schemas
export const optionalSsrfSafeUrlSchema: z.ZodType<
  string | null | undefined,
  string | null | undefined
> = zod.string().nullable().optional().refine(validateSsrfUrl, ssrfRefineOptions);

// Optional variant for webhook edit schemas (non-nullable, rejects empty string)
export const optionalSsrfSafeUrlSchemaNotNullable: z.ZodType<string | undefined, string | undefined> = zod
  .string()
  .optional()
  .refine((url) => url === undefined || validateUrlForSSRFSync(url).isValid, ssrfRefineOptions);
