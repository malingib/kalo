import type { eventTypeAppMetadataOptionalSchema } from "@kalo/app-store/zod-utils";
import type { z } from "zod";

export function getAppActor({
  appSlug,
}: {
  appSlug: string;
  bookingId: number;
  apps: z.infer<typeof eventTypeAppMetadataOptionalSchema>;
}): { type: string; identifier: string } {
  return { type: "app", identifier: appSlug };
}
