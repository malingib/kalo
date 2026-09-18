import { BusyTimesService } from "@kalo/features/busyTimes/services/getBusyTimes";
import { NoSlotsNotificationService } from "@kalo/features/slots/handleNotificationWhenNoSlots";
import { AvailableSlotsService } from "@kalo/trpc/server/routers/viewer/slots/util";

export type { GetScheduleOptions } from "@kalo/trpc/server/routers/viewer/slots/types";

export { AvailableSlotsService };

export { BusyTimesService };

export { NoSlotsNotificationService };

// Round-robin slot validation removed (EE feature) — stub for API v2
export async function validateRoundRobinSlotAvailability(
  _eventTypeId: number,
  _startDate: unknown,
  _endDate: unknown,
  _hosts: unknown[]
): Promise<boolean> {
  return true;
}
