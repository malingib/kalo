import { Frequency } from "@kalo/platform-enums";
import type { Recurrence_2024_06_14 } from "@kalo/platform-types";
import { type TransformRecurringEventSchema_2024_06_14 } from "@kalo/platform-types";

export function transformRecurrenceApiToInternal(
  recurrence: Recurrence_2024_06_14
): TransformRecurringEventSchema_2024_06_14 {
  return {
    interval: recurrence.interval,
    count: recurrence.occurrences,
    freq: Frequency[recurrence.frequency as keyof typeof Frequency],
  } satisfies TransformRecurringEventSchema_2024_06_14;
}
