import { bindModuleToClassOnToken, createModule } from "@kalo/features/di/di";
import { DI_TOKENS } from "@kalo/features/di/tokens";
import { BookingReferenceRepository } from "@kalo/features/bookingReference/repositories/BookingReferenceRepository";
import { moduleLoader as prismaModuleLoader } from "@kalo/features/di/modules/Prisma";

export const bookingReferenceRepositoryModule = createModule();
const token = DI_TOKENS.BOOKING_REFERENCE_REPOSITORY;
const moduleToken = DI_TOKENS.BOOKING_REFERENCE_REPOSITORY_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: bookingReferenceRepositoryModule,
  moduleToken,
  token,
  classs: BookingReferenceRepository,
  depsMap: {
    prismaClient: prismaModuleLoader,
  },
});

export const moduleLoader = {
  token,
  loadModule,
};
