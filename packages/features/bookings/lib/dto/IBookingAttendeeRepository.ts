import type { Prisma } from "@kalo/prisma/client";

export interface IBookingAttendeeRepository {
  deleteManyByBookingId(bookingId: number): Promise<void>;
  deleteByIdAndUpdateBookingResponses(
    attendeeId: number,
    bookingId: number,
    updatedResponses: Prisma.InputJsonValue
  ): Promise<void>;
}
