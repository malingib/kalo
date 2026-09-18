import type { BookingFlowConfig } from "../dto/types";
import type { BookingStatus } from "@kalo/prisma/enums";

export interface BookingCreatedPayload {
  config: BookingFlowConfig;
  bookingFormData: {
    hashedLink: string | null;
  };
  booking: {
    uid: string;
    startTime: Date;
    endTime: Date;
    status: BookingStatus;
    userId: number | null;
    user?: {
      id: number;
    };
  };
}

export interface BookingRescheduledPayload extends BookingCreatedPayload {
  oldBooking: {
    uid: string;
    startTime: Date;
    endTime: Date;
  };
}
