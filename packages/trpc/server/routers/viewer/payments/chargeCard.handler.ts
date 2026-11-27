import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TChargeCardInputSchema } from "./chargeCard.schema";

interface ChargeCardHandlerOptions {
  ctx: { user: NonNullable<TrpcSessionUser> };
  input: TChargeCardInputSchema;
}

/**
 * Card-based no-show charging is intentionally unavailable after the migration
 * to customer-authorized M-Pesa STK payments. M-Pesa does not provide a
 * reusable card hold or an off-session debit equivalent.
 */
export const chargeCardHandler = async (_options: ChargeCardHandlerOptions): Promise<never> => {
  throw new TRPCError({
    code: "PRECONDITION_FAILED",
    message:
      "Automatic no-show charging is unavailable with M-Pesa. Collect payment through an authorized M-Pesa STK Push instead.",
  });
};
