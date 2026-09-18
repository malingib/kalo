import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@kalo/features/di/di";
import { moduleLoader as bookingRepositoryModuleLoader } from "@kalo/features/di/modules/Booking";
import { DI_TOKENS } from "@kalo/features/di/tokens";
import { BookingAttendeesService } from "../services/BookingAttendeesService";
import { moduleLoader as bookingAttendeesRemoveServiceModuleLoader } from "./BookingAttendeesRemoveService.module";

const thisModule = createModule();
const token = DI_TOKENS.BOOKING_ATTENDEES_SERVICE;
const moduleToken = DI_TOKENS.BOOKING_ATTENDEES_SERVICE_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: BookingAttendeesService,
  depsMap: {
    bookingRepository: bookingRepositoryModuleLoader,
    bookingAttendeesRemoveService: bookingAttendeesRemoveServiceModuleLoader,
  },
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { BookingAttendeesService };
