import { createContainer } from "@kalo/features/di/di";
import { CalendarsTaskService } from "@kalo/features/calendars/lib/tasker/CalendarsTaskService";

import { moduleLoader as taskServiceModuleLoader } from "./CalendarsTaskService.module";

const container = createContainer();

export function getCalendarsTaskService(): CalendarsTaskService {
  taskServiceModuleLoader.loadModule(container);
  return container.get<CalendarsTaskService>(taskServiceModuleLoader.token);
}
