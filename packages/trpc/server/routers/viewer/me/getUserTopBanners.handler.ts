import {
  getCalendarCredentials,
  getConnectedCalendars,
} from "@kalo/features/calendars/lib/CalendarManager";
import { buildNonDelegationCredentials } from "@kalo/lib/delegationCredential";
import { prisma } from "@kalo/prisma";
import { credentialForCalendarServiceSelect } from "@kalo/prisma/selects/credential";
import type { TrpcSessionUser } from "@kalo/trpc/server/types";
import { checkInvalidAppCredentials } from "./checkForInvalidAppCredentials";
import { shouldVerifyEmailHandler } from "./shouldVerifyEmail.handler";

const getUpgradeableHandler = async (..._args: unknown[]) => null;
const checkIfOrgNeedsUpgradeHandler = async (..._args: unknown[]) => false;

type Props = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

const _checkInvalidGoogleCalendarCredentials = async ({ ctx }: Props) => {
  const userCredentials = await prisma.credential.findMany({
    where: {
      userId: ctx.user.id,
      type: "google_calendar",
    },
    select: credentialForCalendarServiceSelect,
  });

  // TODO: Call top buildNonDelegationCredentials here can be avoided by moving credential prisma query to repository.
  const calendarCredentials = getCalendarCredentials(buildNonDelegationCredentials(userCredentials));

  const { connectedCalendars } = await getConnectedCalendars(
    calendarCredentials,
    ctx.user.userLevelSelectedCalendars,
    ctx.user.destinationCalendar?.externalId
  );

  return connectedCalendars.some((calendar) => !!calendar.error);
};

export const getUserTopBannersHandler = async ({ ctx }: Props) => {
  const upgradeableTeamMememberships = getUpgradeableHandler({ userId: ctx.user.id });
  const upgradeableOrgMememberships = checkIfOrgNeedsUpgradeHandler({ ctx });
  const shouldEmailVerify = shouldVerifyEmailHandler({ ctx });
  // const isInvalidCalendarCredential = checkInvalidGoogleCalendarCredentials({ ctx });
  const appsWithInavlidCredentials = checkInvalidAppCredentials({ ctx });

  const [
    teamUpgradeBanner,
    orgUpgradeBanner,
    verifyEmailBanner,
    invalidAppCredentialBanners,
  ] = await Promise.allSettled([
    upgradeableTeamMememberships,
    upgradeableOrgMememberships,
    shouldEmailVerify,
    appsWithInavlidCredentials,
  ]);

  return {
    teamUpgradeBanner: teamUpgradeBanner.status === "fulfilled" ? teamUpgradeBanner.value : [],
    orgUpgradeBanner: orgUpgradeBanner.status === "fulfilled" ? orgUpgradeBanner.value : [],
    verifyEmailBanner: verifyEmailBanner.status === "fulfilled" ? !verifyEmailBanner.value.isVerified : false,
    calendarCredentialBanner: false,
    invalidAppCredentialBanners:
      invalidAppCredentialBanners.status === "fulfilled" ? invalidAppCredentialBanners.value : [],
    dueInvoiceBanner: null,
  };
};
