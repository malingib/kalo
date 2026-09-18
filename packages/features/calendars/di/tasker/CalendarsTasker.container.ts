import { createContainer } from "@kalo/features/di/di";
import { CalendarsTasker } from "@kalo/features/calendars/lib/tasker/CalendarsTasker";

import { moduleLoader as taskerModuleLoader } from "./CalendarsTasker.module";

const container = createContainer();

export function getCalendarsTasker(): CalendarsTasker {
  taskerModuleLoader.loadModule(container);
  return container.get<CalendarsTasker>(taskerModuleLoader.token);
}
