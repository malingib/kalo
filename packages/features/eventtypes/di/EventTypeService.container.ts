import { createContainer } from "@kalo/features/di/di";
import { prismaModule } from "@kalo/features/di/modules/Prisma";
import { DI_TOKENS } from "@kalo/features/di/tokens";
import {
  type EventTypeBrandingData,
  type EventTypeService,
  moduleLoader as eventTypeServiceModule,
} from "./EventTypeService.module";

const eventTypeServiceContainer = createContainer();
eventTypeServiceContainer.load(DI_TOKENS.PRISMA_MODULE, prismaModule);

export type { EventTypeBrandingData };

export function getEventTypeService(): EventTypeService {
  eventTypeServiceModule.loadModule(eventTypeServiceContainer);
  return eventTypeServiceContainer.get<EventTypeService>(eventTypeServiceModule.token);
}
