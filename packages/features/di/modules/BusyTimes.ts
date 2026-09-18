import type { IBusyTimesService } from "@kalo/features/busyTimes/services/getBusyTimes";
import { BusyTimesService } from "@kalo/features/busyTimes/services/getBusyTimes";

import { createModule } from "../di";
import { DI_TOKENS } from "../tokens";

export const busyTimesModule = createModule();
busyTimesModule.bind(DI_TOKENS.BUSY_TIMES_SERVICE).toClass(BusyTimesService, {
  bookingRepo: DI_TOKENS.BOOKING_REPOSITORY,
} satisfies Record<keyof IBusyTimesService, symbol>);
