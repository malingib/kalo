import type { Logger } from "tslog";

import { getUTCOffsetByTimezone } from "@kalo/lib/dayjs";
import { ErrorCode } from "@kalo/lib/errorCodes";
import { HttpError } from "@kalo/lib/http-error";
import isOutOfBounds, { BookingDateInPastError } from "@kalo/lib/isOutOfBounds";
import { withReporting } from "@kalo/lib/sentryWrapper";
import type { EventType } from "@kalo/prisma/client";

type ValidateBookingTimeEventType = Pick<
  EventType,
  | "periodType"
  | "periodDays"
  | "periodEndDate"
  | "periodStartDate"
  | "periodCountCalendarDays"
  | "minimumBookingNotice"
  | "eventName"
  | "id"
  | "title"
>;

// Define the function with underscore prefix
const _validateBookingTimeIsNotOutOfBounds = async <T extends ValidateBookingTimeEventType>(
  reqBodyStartTime: string,
  reqBodyTimeZone: string,
  eventType: T,
  eventTimeZone: string | null | undefined,
  logger: Logger<unknown>
) => {
  let timeOutOfBounds = false;
  try {
    timeOutOfBounds = isOutOfBounds(
      reqBodyStartTime,
      {
        periodType: eventType.periodType,
        periodDays: eventType.periodDays,
        periodEndDate: eventType.periodEndDate,
        periodStartDate: eventType.periodStartDate,
        periodCountCalendarDays: eventType.periodCountCalendarDays,
        bookerUtcOffset: getUTCOffsetByTimezone(reqBodyTimeZone) ?? 0,
        eventUtcOffset: eventTimeZone ? (getUTCOffsetByTimezone(eventTimeZone) ?? 0) : 0,
      },
      eventType.minimumBookingNotice
    );
  } catch (error) {
    logger.warn({
      message: "NewBooking: Unable to determine timeOutOfBounds status. Defaulting to false.",
    });

    if (error instanceof BookingDateInPastError) {
      logger.info(`Booking eventType ${eventType.id} failed`, JSON.stringify({ error }));
      throw new HttpError({ statusCode: 400, message: error.message });
    }
  }

  if (timeOutOfBounds) throw new HttpError({ statusCode: 400, message: ErrorCode.BookingTimeOutOfBounds });
};

export const validateBookingTimeIsNotOutOfBounds = withReporting(
  _validateBookingTimeIsNotOutOfBounds,
  "validateBookingTimeIsNotOutOfBounds"
);
