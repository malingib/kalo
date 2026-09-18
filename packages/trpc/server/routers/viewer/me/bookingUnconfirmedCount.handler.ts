import { prisma } from "@kalo/prisma";
import { BookingStatus } from "@kalo/prisma/enums";
import type { TrpcSessionUser } from "@kalo/trpc/server/types";

type BookingUnconfirmedCountOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const bookingUnconfirmedCountHandler = async ({ ctx }: BookingUnconfirmedCountOptions) => {
  const { user } = ctx;
  const count = await prisma.booking.count({
    where: {
      status: BookingStatus.PENDING,
      userId: user.id,
      endTime: { gt: new Date() },
    },
  });
  const recurringGrouping = await prisma.booking.groupBy({
    by: ["recurringEventId"],
    _count: {
      recurringEventId: true,
    },
    where: {
      recurringEventId: { not: { equals: null } },
      status: { equals: "PENDING" },
      userId: user.id,
      endTime: { gt: new Date() },
    },
  });
  return recurringGrouping.reduce((prev, current) => {
    // recurringEventId is the total number of recurring instances for a booking
    // we need to subtract all but one, to represent a single recurring booking
    return prev - (current._count?.recurringEventId - 1);
  }, count);
};
