import { KALO_VERSION } from "@kalo/lib/constants";
import { trpc } from "@kalo/trpc/react";

export function useViewerI18n(locale: string) {
  return trpc.viewer.i18n.get.useQuery(
    { locale, CalComVersion: KALO_VERSION },
    {
      /**
       * i18n should never be clubbed with other queries, so that it's caching can be managed independently.
       **/
      trpc: {
        context: { skipBatch: true },
      },
    }
  );
}
