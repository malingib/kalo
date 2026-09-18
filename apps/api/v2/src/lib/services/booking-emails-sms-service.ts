import { Logger } from "@/lib/logger.bridge";
import { Injectable } from "@nestjs/common";

import { BookingEmailSmsHandler } from "@kalo/platform-libraries/bookings";

@Injectable()
export class BookingEmailSmsService extends BookingEmailSmsHandler {
  constructor(logger: Logger) {
    super({
      logger,
    });
  }
}
