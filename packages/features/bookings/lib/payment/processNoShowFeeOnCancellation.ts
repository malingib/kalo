import logger from "@kalo/lib/logger";
import type { Payment } from "@kalo/prisma/client";

/**
 * M-Pesa STK Push is an upfront, customer-authorized payment flow. It cannot
 * collect a card hold or silently charge a no-show fee later. Legacy HOLD
 * payments are therefore never charged after cancellation.
 */
export const processNoShowFeeOnCancellation = async ({
  booking,
  payments,
}: {
  booking: { uid: string };
  payments: Payment[];
  cancelledByUserId?: number;
}) => {
  const hasLegacyHold = payments.some((payment) => payment.paymentOption === "HOLD" && !payment.success);
  if (hasLegacyHold) {
    logger
      .getSubLogger({ prefix: ["processNoShowFeeOnCancellation"] })
      .info(`Skipping automatic no-show charge for booking ${booking.uid}: M-Pesa does not support card holds or delayed charges`);
  }
};
