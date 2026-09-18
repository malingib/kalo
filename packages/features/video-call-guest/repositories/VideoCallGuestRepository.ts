import type { PrismaClient } from "@kalo/prisma";

export class VideoCallGuestRepository {
  constructor(private prismaClient: PrismaClient) {}

  async upsertVideoCallGuest({
    bookingUid,
    email,
    name,
  }: {
    bookingUid: string;
    email: string;
    name: string;
  }) {
    return await this.prismaClient.videoCallGuest.upsert({
      where: {
        bookingUid_email: {
          bookingUid,
          email,
        },
      },
      update: { name },
      create: {
        bookingUid,
        email,
        name,
      },
    });
  }
}
