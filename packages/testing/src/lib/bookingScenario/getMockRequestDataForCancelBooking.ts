import type { bookingCancelSchema } from "@kalo/prisma/zod-utils";
import type z from "zod";

export function getMockRequestDataForCancelBooking(data: z.infer<typeof bookingCancelSchema>) {
  return data;
}
