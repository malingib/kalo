export type { Tasker } from "@kalo/features/tasker/tasker";
export { getTasker } from "@kalo/features/tasker/tasker-factory";

// Billing tasker helpers removed (EE feature) — stubs for API v2
export function getIncrementUsageIdempotencyKey(bookingUid: string): string {
  return `increment-usage-${bookingUid}`;
}

export function getIncrementUsageJobTag(bookingUid: string): string {
  return `increment-usage-tag-${bookingUid}`;
}
