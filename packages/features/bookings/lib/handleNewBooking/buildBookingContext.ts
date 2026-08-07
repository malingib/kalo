import { getUsernameList } from "@calcom/features/eventtypes/lib/defaultEvents";
import { getFullName } from "@calcom/features/form-builder/utils";
import { shouldIgnoreContactOwner } from "@calcom/lib/bookings/routing/utils";
import type { getEventTypeResponse } from "./getEventTypesFromDB";

type BookingContextEventType = Pick<getEventTypeResponse, "team" | "parent" | "owner">;

type BookingContextBookingData = {
  eventTypeId: number;
  eventTypeSlug: string;
  name: string;
  email: string;
  attendeePhoneNumber?: string | null;
};

type BookingContextReqBody = {
  user?: string | string[] | null;
  teamMemberEmail?: string | null;
  skipContactOwner?: boolean | null;
  rescheduleUid?: string | null;
  routedTeamMemberIds?: number[] | null;
};

export type BookingContext = {
  eventTypeId: number;
  eventTypeSlug: string;
  eventTypeOrganizationId: number | null;
  bookerName: string;
  bookerEmail: string;
  bookerPhoneNumber: string | null;
  dynamicUserList: string[];
  fullName: string;
  contactOwnerFromReq: string | null;
  contactOwnerEmail: string | null;
  skipContactOwner: boolean;
};

export const buildBookingContext = ({
  eventType,
  bookingData,
  reqBody,
}: {
  eventType: BookingContextEventType;
  bookingData: BookingContextBookingData;
  reqBody: BookingContextReqBody;
}): BookingContext => {
  const contactOwnerFromReq = reqBody.teamMemberEmail ?? null;
  const skipContactOwner = shouldIgnoreContactOwner({
    skipContactOwner: reqBody.skipContactOwner ?? null,
    rescheduleUid: reqBody.rescheduleUid ?? null,
    routedTeamMemberIds: reqBody.routedTeamMemberIds ?? null,
  });

  let contactOwnerEmail: string | null = contactOwnerFromReq;
  if (skipContactOwner) {
    contactOwnerEmail = null;
  }

  let dynamicUserList: string[];
  if (Array.isArray(reqBody.user)) {
    dynamicUserList = reqBody.user;
  } else {
    dynamicUserList = getUsernameList(reqBody.user ?? null);
  }

  const eventTypeOrganizationId =
    eventType.team?.parentId ??
    eventType.parent?.team?.parentId ??
    eventType.owner?.profiles?.[0]?.organizationId ??
    null;

  return {
    eventTypeId: bookingData.eventTypeId,
    eventTypeSlug: bookingData.eventTypeSlug,
    eventTypeOrganizationId,
    bookerName: bookingData.name,
    bookerEmail: bookingData.email,
    bookerPhoneNumber: bookingData.attendeePhoneNumber ?? null,
    dynamicUserList,
    fullName: getFullName(bookingData.name),
    contactOwnerFromReq,
    contactOwnerEmail,
    skipContactOwner,
  };
};
