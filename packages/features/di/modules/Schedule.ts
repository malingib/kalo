import { DI_TOKENS } from "@kalo/features/di/tokens";
import { ScheduleRepository } from "@kalo/features/schedules/repositories/ScheduleRepository";

import { createModule } from "../di";

export const scheduleRepositoryModule = createModule();
scheduleRepositoryModule
  .bind(DI_TOKENS.SCHEDULE_REPOSITORY)
  .toClass(ScheduleRepository, [DI_TOKENS.PRISMA_CLIENT]); // Maps 'prismaClient' param to PRISMA_CLIENT token
