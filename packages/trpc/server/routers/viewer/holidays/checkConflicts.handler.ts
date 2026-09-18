import { getHolidayService } from "@kalo/lib/holidays";
import type { TrpcSessionUser } from "@kalo/trpc/server/types";

import type { TCheckConflictsSchema } from "./checkConflicts.schema";

type CheckConflictsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCheckConflictsSchema;
};

export type { ConflictingBooking, HolidayConflict } from "@kalo/lib/holidays/HolidayService";

export async function checkConflictsHandler({ ctx, input }: CheckConflictsOptions) {
  const holidayService = getHolidayService();
  return holidayService.checkConflicts(ctx.user.id, input.countryCode, input.disabledIds);
}

export default checkConflictsHandler;
