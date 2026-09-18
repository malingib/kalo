import type { z } from "zod";

import { bookingConfirmPatchBodySchema } from "@kalo/prisma/zod-utils";

export const ZConfirmInputSchema = bookingConfirmPatchBodySchema;

export type TConfirmInputSchema = z.infer<typeof ZConfirmInputSchema>;
