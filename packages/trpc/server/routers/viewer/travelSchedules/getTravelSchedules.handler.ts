import { TravelScheduleRepository } from "@kalo/features/travelSchedule/repositories/TravelScheduleRepository";
import type { TrpcSessionUser } from "@kalo/trpc/server/types";

type GetTravelSchedulesOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const getTravelSchedulesHandler = async ({ ctx }: GetTravelSchedulesOptions) => {
  return await TravelScheduleRepository.findTravelSchedulesByUserId(ctx.user.id);
};
