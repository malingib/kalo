/**
 * Normalizes Kenyan phone numbers to standard 2547XXXXXXXX or 2541XXXXXXXX format.
 * Supports formats:
 * - 0712345678 -> 254712345678
 * - 0112345678 -> 254112345678
 * - +254712345678 -> 254712345678
 * - 254712345678 -> 254712345678
 */
export function normalizeKenyanPhone(phone: string): string | null {
  const sanitized = phone.replace(/\D/g, "");

  // If starting with 07 or 01 and 10 digits
  if (sanitized.length === 10 && (sanitized.startsWith("07") || sanitized.startsWith("01"))) {
    return `254${sanitized.slice(1)}`;
  }

  // If starting with 254 and 12 digits
  if (sanitized.length === 12 && (sanitized.startsWith("2547") || sanitized.startsWith("2541"))) {
    return sanitized;
  }

  return null;
}
