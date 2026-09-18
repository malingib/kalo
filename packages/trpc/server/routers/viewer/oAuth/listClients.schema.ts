import { z } from "zod";

import { OAuthClientStatus } from "@kalo/prisma/enums";

export const ZListClientsInputSchema = z.object({
  status: z.nativeEnum(OAuthClientStatus).optional(),
});

export type TListClientsInputSchema = z.infer<typeof ZListClientsInputSchema>;
