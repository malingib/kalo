import type { DestinationCalendarRepository } from "@kalo/features/calendars/repositories/DestinationCalendarRepository";

import { createContainer } from "../di";
import { moduleLoader as destinationCalendarRepositoryModuleLoader } from "../modules/DestinationCalendar";

const container = createContainer();

export function getDestinationCalendarRepository() {
  destinationCalendarRepositoryModuleLoader.loadModule(container);
  return container.get<DestinationCalendarRepository>(destinationCalendarRepositoryModuleLoader.token);
}
