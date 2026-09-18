import { enrichUserWithDelegationCredentialsIncludeServiceAccountKey } from "@kalo/app-store/delegationCredential";
import { withSelectedCalendars } from "@kalo/lib/server/withSelectedCalendars";
import { availabilityUserSelect } from "@kalo/prisma";
import { prisma } from "@kalo/prisma";
import type { Prisma } from "@kalo/prisma/client";
import { credentialForCalendarServiceSelect } from "@kalo/prisma/selects/credential";

export async function findUsersForAvailabilityCheck({ where }: { where: Prisma.UserWhereInput }) {
  const user = await prisma.user.findFirst({
    where,
    select: {
      ...availabilityUserSelect,
      selectedCalendars: true,
      credentials: {
        select: credentialForCalendarServiceSelect,
      },
    },
  });

  if (!user) {
    return null;
  }

  return await enrichUserWithDelegationCredentialsIncludeServiceAccountKey({
    user: withSelectedCalendars(user),
  });
}
