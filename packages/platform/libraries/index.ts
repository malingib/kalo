import { getBookingForReschedule } from "@kalo/features/bookings/lib/get-booking";
import getAllUserBookings from "@kalo/features/bookings/lib/getAllUserBookings";
import { getBookingFieldsWithSystemFields } from "@kalo/features/bookings/lib/getBookingFields";
import getBookingInfo from "@kalo/features/bookings/lib/getBookingInfo";
import handleCancelBooking from "@kalo/features/bookings/lib/handleCancelBooking";
import handleMarkNoShow from "@kalo/features/handleMarkNoShow";
import { getTranslation } from "@kalo/i18n/server";
import { symmetricDecrypt, symmetricEncrypt } from "@kalo/lib/crypto";
import type { Prisma } from "@kalo/prisma/client";
import { credentialForCalendarServiceSelect } from "@kalo/prisma/selects/credential";
import { paymentDataSelect } from "@kalo/prisma/selects/payment";

export { slugify } from "@kalo/lib/slugify";
export { slugifyLenient } from "@kalo/lib/slugify-lenient";
export { getBookingForReschedule };

export { getWebhookProducer } from "@kalo/features/di/webhooks/containers/webhook";
export { getUsernameList } from "@kalo/features/eventtypes/lib/defaultEvents";
export {
  DEFAULT_WEBHOOK_VERSION,
  WebhookVersion,
} from "@kalo/features/webhooks/lib/interface/IWebhookRepository";
export type { IWebhookProducerService } from "@kalo/features/webhooks/lib/interface/WebhookProducerService";
export {
  AttributeType,
  CreationSource,
  MembershipRole,
  PeriodType,
  SchedulingType,
  TimeUnit,
  WebhookTriggerEvents,
} from "@kalo/prisma/enums";
export type { CalendarEvent, EventBusyDate } from "@kalo/types/Calendar";

export { handleMarkNoShow };

export type {
  BookingCreateBody,
  BookingResponse,
} from "@kalo/features/bookings/types";
export type { ConnectedCalendar } from "@kalo/features/calendars/lib/CalendarManager";
export {
  getBusyCalendarTimes,
  updateEvent,
} from "@kalo/features/calendars/lib/CalendarManager";
export type { ConnectedDestinationCalendars } from "@kalo/features/calendars/lib/getConnectedDestinationCalendars";
export { getConnectedDestinationCalendarsAndEnsureDefaultsInDb } from "@kalo/features/calendars/lib/getConnectedDestinationCalendars";
export type { CityTimezones } from "@kalo/features/cityTimezones/cityTimezonesHandler";
export { cityTimezonesHandler } from "@kalo/features/cityTimezones/cityTimezonesHandler";
export { ENABLE_ASYNC_TASKER, MINUTES_TO_BOOK } from "@kalo/lib/constants";
export { TRPCError } from "@trpc/server";

export { getAllUserBookings };
export { getBookingInfo };
export { handleCancelBooking };

export { dynamicEvent } from "@kalo/features/eventtypes/lib/defaultEvents";
export { parseBookingLimit } from "@kalo/lib/intervalLimits/isBookingLimits";
export { parseRecurringEvent } from "@kalo/lib/isRecurringEvent";
export {
  bookingMetadataSchema,
  teamMetadataSchema,
  userMetadata,
} from "@kalo/prisma/zod-utils";

export { symmetricEncrypt, symmetricDecrypt };

export { getTranslation };

export { validateCustomEventName } from "@kalo/features/eventtypes/lib/eventNaming";

export type TeamQuery = Prisma.TeamGetPayload<{
  select: {
    id: true;
    credentials: {
      select: typeof import("@kalo/prisma/selects/credential").credentialForCalendarServiceSelect;
    };
    name: true;
    logoUrl: true;
    members: {
      select: {
        role: true;
      };
    };
  };
}>;

export { credentialForCalendarServiceSelect };
export { paymentDataSelect };
export { confirmHandler as confirmBookingHandler } from "@kalo/trpc/server/routers/viewer/bookings/confirm.handler";
export { getBookingFieldsWithSystemFields };

export { checkAdminOrOwner } from "@kalo/features/auth/lib/checkAdminOrOwner";
export { sendLocationChangeEmailsAndSMS } from "@kalo/emails/email-manager";
export { verifyCodeUnAuthenticated } from "@kalo/features/auth/lib/verifyCodeUnAuthenticated";
export { sendEmailVerificationByCode } from "@kalo/features/auth/lib/verifyEmail";
export { getCalendarLinks } from "@kalo/features/bookings/lib/getCalendarLinks";
export { BookingReferenceRepository } from "@kalo/features/bookingReference/repositories/BookingReferenceRepository";
export { BookingAccessService } from "@kalo/features/bookings/services/BookingAccessService";
export { CredentialRepository } from "@kalo/features/credentials/repositories/CredentialRepository";
export type { OrgMembershipLookup } from "@kalo/features/di/modules/OrgMembershipLookup";
export type { OAuth2Tokens } from "@kalo/features/oauth/services/OAuthService";
export { OAuthService } from "@kalo/features/oauth/services/OAuthService";
export { generateSecret } from "@kalo/features/oauth/utils/generateSecret";
export { ProfileRepository } from "@kalo/features/profile/repositories/ProfileRepository";
export { SelectedCalendarRepository } from "@kalo/features/selectedCalendar/repositories/SelectedCalendarRepository";
export type { Tasker } from "@kalo/features/tasker/tasker";
export { getTasker } from "@kalo/features/tasker/tasker-factory";
export { buildCalEventFromBooking } from "@kalo/lib/buildCalEventFromBooking";
export { getVideoCallUrlFromCalEvent } from "@kalo/lib/CalEventParser";
export { verifyCodeChallenge } from "@kalo/lib/pkce";
export { encryptServiceAccountKey } from "@kalo/lib/server/serviceAccountKey";
export { validateUrlForSSRFSync } from "@kalo/lib/ssrfProtection";
export type { TraceContext } from "@kalo/lib/tracing";
export { distributedTracing } from "@kalo/lib/tracing/factory";
export {
  type BookingWithUserAndEventDetails,
  bookingWithUserAndEventDetailsSelect,
} from "@kalo/prisma/selects/booking";
export { checkEmailVerificationRequired } from "@kalo/trpc/server/routers/publicViewer/checkIfUserEmailVerificationRequired.handler";
export type { CredentialForCalendarService } from "@kalo/types/Credential";

// === Stubs for deleted EE features still imported by API v2 ===

// Round-robin reassignment removed (EE feature) — stubs for API v2
export async function roundRobinManualReassignment(_args: {
  bookingId: number;
  newUserId: number;
  orgId?: number | null;
  reassignReason?: string;
  reassignedById?: number;
  emailsEnabled?: boolean;
  platformClientParams?: unknown;
  actionSource?: string;
  reassignedByUuid?: string;
}): Promise<void> {
  // No-op in community edition
}

export async function roundRobinReassignment(_args: {
  bookingId: number;
  orgId?: number | null;
  emailsEnabled?: boolean;
  platformClientParams?: unknown;
  reassignedById?: number;
  actionSource?: string;
  reassignedByUuid?: string;
}): Promise<void> {
  // No-op in community edition
}

// createApiKeyHandler removed (EE feature) — stub for API v2
export async function createApiKeyHandler(_args: {
  ctx: { user: { id: number } };
  input: {
    note?: string | null;
    neverExpires?: boolean;
    expiresAt?: Date | null;
    teamId?: number;
  };
}): Promise<string> {
  throw new Error("API key creation is not available in community edition");
}

// getClientSecretFromPayment removed (EE feature) — stub for API v2
export function getClientSecretFromPayment(payment: { data: Record<string, unknown> }): string | null {
  const data = payment.data;
  if (data && typeof data === "object" && "client_secret" in data) {
    return data.client_secret as string;
  }
  return null;
}

// verifyCodeAuthenticated removed (EE feature) — stub for API v2
export async function verifyCodeAuthenticated(_args: {
  user: { id: number; email?: string; [key: string]: unknown };
  email: string;
  code: string;
}): Promise<boolean> {
  return false;
}

// createNewUsersConnectToOrgIfExists removed (EE feature) — stub for API v2
export async function createNewUsersConnectToOrgIfExists(_args: {
  invitations: { usernameOrEmail: string; role: string }[];
  creationSource?: string;
  teamId: number;
  isOrg: boolean;
  parentId: number | null;
  autoAcceptEmailDomain: string;
  orgConnectInfoByUsernameOrEmail: Record<string, { orgId: number; autoAccept: boolean }>;
  isPlatformManaged?: boolean;
  timeFormat?: number;
  weekStart?: string;
  timeZone?: string;
  language?: string;
}): Promise<{ id: number; email: string; username: string }[]> {
  throw new Error("Organization user creation is not available in community edition");
}

// sendVerificationCode removed (EE feature) — stub for API v2
export async function sendVerificationCode(_phoneNumber: string): Promise<void> {
  throw new Error("Phone verification is not available in community edition");
}

// verifyPhoneNumber removed (EE feature) — stub for API v2
export async function verifyPhoneNumber(
  _phoneNumber: string,
  _code: string,
  _userId: number,
  _teamId?: number
): Promise<boolean> {
  throw new Error("Phone verification is not available in community edition");
}
