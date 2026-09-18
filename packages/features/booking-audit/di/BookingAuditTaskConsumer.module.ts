import { BookingAuditTaskConsumer } from "@kalo/features/booking-audit/lib/service/BookingAuditTaskConsumer";
import { BOOKING_AUDIT_DI_TOKENS } from "@kalo/features/booking-audit/di/tokens";
import { moduleLoader as bookingAuditRepositoryModuleLoader } from "@kalo/features/booking-audit/di/BookingAuditRepository.module";
import { moduleLoader as auditActorRepositoryModuleLoader } from "@kalo/features/booking-audit/di/AuditActorRepository.module";
import { moduleLoader as attendeeRepositoryModuleLoader } from "@kalo/features/bookings/di/Attendee.module";
import { moduleLoader as featuresRepositoryModuleLoader } from "@kalo/features/di/modules/FeaturesRepository";
import { moduleLoader as userRepositoryModuleLoader } from "@kalo/features/di/modules/User";

import { createModule, bindModuleToClassOnToken } from "../../di/di";

export const bookingAuditTaskConsumerModule = createModule();
const token = BOOKING_AUDIT_DI_TOKENS.BOOKING_AUDIT_TASK_CONSUMER;
const moduleToken = BOOKING_AUDIT_DI_TOKENS.BOOKING_AUDIT_TASK_CONSUMER_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: bookingAuditTaskConsumerModule,
  moduleToken,
  token,
  classs: BookingAuditTaskConsumer,
  depsMap: {
    bookingAuditRepository: bookingAuditRepositoryModuleLoader,
    auditActorRepository: auditActorRepositoryModuleLoader,
    featuresRepository: featuresRepositoryModuleLoader,
    attendeeRepository: attendeeRepositoryModuleLoader,
    userRepository: userRepositoryModuleLoader,
  },
});

export const moduleLoader = {
  token,
  loadModule,
};
