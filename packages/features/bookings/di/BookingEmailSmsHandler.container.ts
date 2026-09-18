import type { BookingEmailSmsHandler } from "@kalo/features/bookings/lib/BookingEmailSmsHandler";
import { createContainer } from "@kalo/features/di/di";
import { moduleLoader as BookingEmailSmsHandlerModule } from "./BookingEmailSmsHandler.module";

const container = createContainer();

export function getBookingEmailSmsHandler(): BookingEmailSmsHandler {
  BookingEmailSmsHandlerModule.loadModule(container);
  return container.get<BookingEmailSmsHandler>(BookingEmailSmsHandlerModule.token);
}
