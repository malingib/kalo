import { BookingEmailAndSmsTaskService } from "@kalo/features/bookings/lib/tasker/BookingEmailAndSmsTaskService";
import { createContainer } from "@kalo/features/di/di";

import { moduleLoader as BookingEmailAndSmsTaskServiceModule } from "./BookingEmailAndSmsTaskService.module";

const container = createContainer();

export function getBookingEmailAndSmsTaskService(): BookingEmailAndSmsTaskService {
  BookingEmailAndSmsTaskServiceModule.loadModule(container);
  return container.get<BookingEmailAndSmsTaskService>(BookingEmailAndSmsTaskServiceModule.token);
}
