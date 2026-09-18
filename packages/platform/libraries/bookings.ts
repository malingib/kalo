export { getBookingAttendeesService } from "@kalo/features/bookings/di/BookingAttendeesService.container";
export { BookingEmailSmsHandler } from "@kalo/features/bookings/lib/BookingEmailSmsHandler";
export { CheckBookingLimitsService } from "@kalo/features/bookings/lib/checkBookingLimits";
export type { RegularBookingCreateResult } from "@kalo/features/bookings/lib/dto/types";
export { LuckyUserService } from "@kalo/features/bookings/lib/getLuckyUser";
export { BookingCancelService } from "@kalo/features/bookings/lib/handleCancelBooking";
export { CheckBookingAndDurationLimitsService } from "@kalo/features/bookings/lib/handleNewBooking/checkBookingAndDurationLimits";
export { BookingEventHandlerService } from "@kalo/features/bookings/lib/onBookingEvents/BookingEventHandlerService";
export { RecurringBookingService } from "@kalo/features/bookings/lib/service/RecurringBookingService";
export { RegularBookingService } from "@kalo/features/bookings/lib/service/RegularBookingService";
export { BookingEmailAndSmsSyncTasker } from "@kalo/features/bookings/lib/tasker/BookingEmailAndSmsSyncTasker";
export { BookingEmailAndSmsTasker } from "@kalo/features/bookings/lib/tasker/BookingEmailAndSmsTasker";
export { BookingEmailAndSmsTaskService } from "@kalo/features/bookings/lib/tasker/BookingEmailAndSmsTaskService";
export { BookingEmailAndSmsTriggerDevTasker } from "@kalo/features/bookings/lib/tasker/BookingEmailAndSmsTriggerTasker";
export { BookingAttendeesRemoveService } from "@kalo/features/bookings/services/BookingAttendeesRemoveService";
export { BookingAttendeesService } from "@kalo/features/bookings/services/BookingAttendeesService";
export { getWebhookProducer } from "@kalo/features/di/webhooks/containers/webhook";
export { PrismaOrgMembershipRepository } from "@kalo/features/membership/repositories/PrismaOrgMembershipRepository";
export type { IWebhookProducerService } from "@kalo/features/webhooks/lib/interface/WebhookProducerService";
export {
  type BookingWithUserAndEventDetails,
  bookingWithUserAndEventDetailsSelect,
} from "@kalo/prisma/selects/booking";
export { addGuestsHandler } from "@kalo/trpc/server/routers/viewer/bookings/addGuests.handler";

// Booking audit was removed during EE cleanup — makeUserActor stub for API v2
export function makeUserActor(_uuid: string): { type: string; actorId: string } {
  return { type: "user", actorId: _uuid };
}
