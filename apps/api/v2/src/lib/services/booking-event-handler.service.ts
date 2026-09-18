import { BookingEventHandlerService as BaseBookingEventHandlerService } from "@kalo/platform-libraries/bookings";
import { Injectable } from "@nestjs/common";
import { HashedLinkService } from "./hashed-link.service";
import { Logger } from "@/lib/logger.bridge";

@Injectable()
export class BookingEventHandlerService extends BaseBookingEventHandlerService {
  constructor(hashedLinkService: HashedLinkService, bridgeLogger: Logger) {
    super({
      log: bridgeLogger,
      hashedLinkService,
    });
  }
}
