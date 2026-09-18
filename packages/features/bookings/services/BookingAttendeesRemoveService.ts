import AttendeeCancelledEmail from "@kalo/emails/templates/attendee-cancelled-email";
import type { PrismaBookingAttendeeRepository } from "@kalo/features/bookings/repositories/PrismaBookingAttendeeRepository";
import { getTranslation } from "@kalo/i18n/server";
import { ErrorWithCode } from "@kalo/lib/errors";
import { extractBaseEmail } from "@kalo/lib/extract-base-email";
import logger from "@kalo/lib/logger";
import type { BookingResponses } from "@kalo/prisma/zod-utils";
import type { Booking, TUser } from "@kalo/trpc/server/routers/viewer/bookings/addGuests.handler";
import {
  buildCalendarEvent,
  getBooking,
  getOrganizerData,
  prepareAttendeesList,
  updateCalendarEvent,
  validateUserPermissions,
} from "@kalo/trpc/server/routers/viewer/bookings/addGuests.handler";
import type { CalendarEvent, Person } from "@kalo/types/Calendar";

type RemoveAttendeeInput = {
  bookingId: number;
  attendeeId: number;
  user: TUser;
  emailsEnabled?: boolean;
};

export type RemovedAttendee = {
  id: number;
  bookingId: number;
  name: string;
  email: string;
  timeZone: string;
};

export type BookingAttendeesRemoveServiceDeps = {
  bookingAttendeeRepository: PrismaBookingAttendeeRepository;
};

export class BookingAttendeesRemoveService {
  constructor(private readonly deps: BookingAttendeesRemoveServiceDeps) {}

  async removeAttendee({
    bookingId,
    attendeeId,
    user,
    emailsEnabled = true,
  }: RemoveAttendeeInput): Promise<RemovedAttendee> {
    const booking = await getBooking(bookingId);
    await validateUserPermissions(booking, user);

    const attendeeToRemove = this.findAndValidateAttendee(booking, attendeeId);
    const remainingAttendees = booking.attendees.filter((a) => a.id !== attendeeId);
    const attendeesList = await prepareAttendeesList(remainingAttendees);
    await this.removeAttendeeFromBooking(bookingId, attendeeId, attendeeToRemove.email, booking);

    const organizer = await getOrganizerData(booking.userId);

    const evt = await buildCalendarEvent(booking, organizer, attendeesList);
    await updateCalendarEvent(booking, evt);

    if (emailsEnabled) {
      this.sendCancellationEmail(attendeeToRemove, evt);
    }

    return {
      id: attendeeToRemove.id,
      bookingId: booking.id,
      name: attendeeToRemove.name,
      email: attendeeToRemove.email,
      timeZone: attendeeToRemove.timeZone,
    };
  }

  private findAndValidateAttendee(booking: Booking, attendeeId: number): Booking["attendees"][number] {
    const attendee = booking.attendees.find((a) => a.id === attendeeId);

    if (!attendee) {
      throw ErrorWithCode.Factory.NotFound("attendee_not_found");
    }

    const sortedAttendees = [...booking.attendees].sort((a, b) => a.id - b.id);
    const primaryAttendee = sortedAttendees[0];

    if (primaryAttendee && attendee.id === primaryAttendee.id) {
      throw ErrorWithCode.Factory.BadRequest("cannot_remove_primary_attendee");
    }

    return attendee;
  }

  private async removeAttendeeFromBooking(
    bookingId: number,
    attendeeId: number,
    attendeeEmail: string,
    booking: Booking
  ): Promise<void> {
    const bookingResponses = booking.responses as BookingResponses;
    const baseEmailToRemove = extractBaseEmail(attendeeEmail).toLowerCase();

    const updatedGuests = (bookingResponses?.guests || []).filter((guestEmail: string) => {
      return extractBaseEmail(guestEmail).toLowerCase() !== baseEmailToRemove;
    });

    await this.deps.bookingAttendeeRepository.deleteByIdAndUpdateBookingResponses(attendeeId, bookingId, {
      ...bookingResponses,
      guests: updatedGuests,
    });
  }

  private async prepareAttendeePerson(attendee: Booking["attendees"][number]): Promise<Person> {
    return {
      name: attendee.name,
      email: attendee.email,
      timeZone: attendee.timeZone,
      language: {
        translate: await getTranslation(attendee.locale ?? "en", "common"),
        locale: attendee.locale ?? "en",
      },
    };
  }

  private async sendCancellationEmail(
    attendeeToRemove: Booking["attendees"][number],
    evt: CalendarEvent
  ): Promise<void> {
    try {
      const removedAttendeePerson = await this.prepareAttendeePerson(attendeeToRemove);
      const email = new AttendeeCancelledEmail(evt, removedAttendeePerson);
      await email.sendEmail();
    } catch (error) {
      logger.error("Failed to send cancellation email to removed attendee", {
        errorName: error instanceof Error ? error.name : "unknown_error",
      });
    }
  }
}
