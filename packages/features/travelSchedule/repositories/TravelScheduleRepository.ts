import { prisma } from "@kalo/prisma";

export class TravelScheduleRepository {
  static async findTravelSchedulesByUserId(userId: number) {
    const allTravelSchedules = await prisma.travelSchedule.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        timeZone: true,
      },
    });

    return allTravelSchedules;
  }
}
