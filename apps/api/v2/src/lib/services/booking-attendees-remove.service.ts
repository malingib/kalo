import { PrismaBookingAttendeeRepository } from "@/lib/repositories/prisma-booking-attendee.repository";
import { Injectable } from "@nestjs/common";

import { BookingAttendeesRemoveService as BaseBookingAttendeesRemoveService } from "@kalo/platform-libraries/bookings";

@Injectable()
export class BookingAttendeesRemoveService extends BaseBookingAttendeesRemoveService {
  constructor(bookingAttendeeRepository: PrismaBookingAttendeeRepository) {
    super({ bookingAttendeeRepository });
  }
}
