import { moduleLoader as bookingEventHandlerModuleLoader } from "@kalo/features/bookings/di/BookingEventHandlerService.module";
import { RegularBookingService } from "@kalo/features/bookings/lib/service/RegularBookingService";
import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@kalo/features/di/di";
import { moduleLoader as bookingRepositoryModuleLoader } from "@kalo/features/di/modules/Booking";
import { moduleLoader as checkBookingAndDurationLimitsModuleLoader } from "@kalo/features/di/modules/CheckBookingAndDurationLimits";
import { moduleLoader as luckyUserServiceModuleLoader } from "@kalo/features/di/modules/LuckyUser";
import { moduleLoader as prismaModuleLoader } from "@kalo/features/di/modules/Prisma";
import { moduleLoader as userRepositoryModuleLoader } from "@kalo/features/di/modules/User";
import { DI_TOKENS } from "@kalo/features/di/tokens";
import { moduleLoader as webhookProducerModuleLoader } from "@kalo/features/di/webhooks/modules/WebhookProducerService.module";
import { moduleLoader as hashedLinkServiceModuleLoader } from "@kalo/features/hashedLink/di/HashedLinkService.module";
import { moduleLoader as bookingEmailAndSmsTaskerModuleLoader } from "./tasker/BookingEmailAndSmsTasker.module";

const thisModule = createModule();
const token = DI_TOKENS.REGULAR_BOOKING_SERVICE;
const moduleToken = DI_TOKENS.REGULAR_BOOKING_SERVICE_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: RegularBookingService,
  depsMap: {
    // TODO: In a followup PR, we aim to remove prisma dependency and instead inject the repositories as dependencies.
    prismaClient: prismaModuleLoader,
    checkBookingAndDurationLimitsService: checkBookingAndDurationLimitsModuleLoader,
    bookingRepository: bookingRepositoryModuleLoader,
    luckyUserService: luckyUserServiceModuleLoader,
    userRepository: userRepositoryModuleLoader,
    hashedLinkService: hashedLinkServiceModuleLoader,
    bookingEmailAndSmsTasker: bookingEmailAndSmsTaskerModuleLoader,
    bookingEventHandler: bookingEventHandlerModuleLoader,
    webhookProducer: webhookProducerModuleLoader,
  },
});

export const moduleLoader = {
  token,
  loadModule,
} satisfies ModuleLoader;

export type { RegularBookingService };
