import type { PrismaClient } from "@kalo/prisma";
import prisma from "@kalo/prisma";

import type { TrackingRepositoryInterface } from "./TrackingRepository.interface";

export class PrismaTrackingRepository implements TrackingRepositoryInterface {
  constructor(private readonly prismaClient: PrismaClient = prisma) {}

  async findByBookingUid(bookingUid: string) {
    return await this.prismaClient.tracking.findFirst({
      where: {
        booking: {
          uid: bookingUid,
        },
      },
    });
  }
}
