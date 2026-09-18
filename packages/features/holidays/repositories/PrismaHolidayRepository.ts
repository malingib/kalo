import type { PrismaClient } from "@kalo/prisma";
import type { Prisma } from "@kalo/prisma/client";

export class PrismaHolidayRepository {
  constructor(private prismaClient: PrismaClient) {}

  async findUserSettingsSelect<T extends Prisma.UserHolidaySettingsSelect>({
    userId,
    select,
  }: {
    userId: number;
    select: T;
  }) {
    return this.prismaClient.userHolidaySettings.findUnique({
      where: { userId },
      select,
    });
  }
}
