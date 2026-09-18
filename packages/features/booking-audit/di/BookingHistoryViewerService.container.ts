import { createContainer } from "@kalo/features/di/di";

import {
  type BookingHistoryViewerService,
  moduleLoader as bookingHistoryViewerServiceModule,
} from "./BookingHistoryViewerService.module";

const container = createContainer();

export function getBookingHistoryViewerService() {
  bookingHistoryViewerServiceModule.loadModule(container);

  return container.get<BookingHistoryViewerService>(bookingHistoryViewerServiceModule.token);
}
