import { getCalendar } from "@kalo/app-store/_utils/getCalendar";
import { getAllDelegationCredentialsForUserIncludeServiceAccountKey } from "@kalo/app-store/delegationCredential";
import { getDelegationCredentialOrFindRegularCredential } from "@kalo/app-store/delegationCredential";
import { deleteMeeting } from "@kalo/features/conferencing/lib/videoClient";
import prisma from "@kalo/prisma";
import type { Attendee } from "@kalo/prisma/client";
import { BookingStatus } from "@kalo/prisma/enums";
import type { CalendarEvent } from "@kalo/types/Calendar";

import type { OriginalRescheduledBooking } from "../../handleNewBooking/originalRescheduledBookingUtils";

/* Check if the original booking has no more attendees, if so delete the booking
  and any calendar or video integrations */
const lastAttendeeDeleteBooking = async (
  originalRescheduledBooking: OriginalRescheduledBooking,
  filteredAttendees: Partial<Attendee>[] | undefined,
  originalBookingEvt?: CalendarEvent
) => {
  let deletedReferences = false;
  const bookingUser = originalRescheduledBooking?.user;
  const delegationCredentials = bookingUser
    ? // We fetch delegation credentials with ServiceAccount key as CalendarService instance created later in the flow needs it
      await getAllDelegationCredentialsForUserIncludeServiceAccountKey({
        user: { email: bookingUser.email, id: bookingUser.id },
      })
    : [];
  if ((!filteredAttendees || filteredAttendees.length === 0) && originalRescheduledBooking) {
    const integrationsToDelete = [];

    for (const reference of originalRescheduledBooking.references) {
      if (reference.credentialId || reference.delegationCredentialId) {
        const credential = await getDelegationCredentialOrFindRegularCredential({
          id: {
            credentialId: reference.credentialId,
            delegationCredentialId: reference.delegationCredentialId,
          },
          delegationCredentials,
        });

        if (credential) {
          if (reference.type.includes("_video")) {
            integrationsToDelete.push(deleteMeeting(credential, reference.uid));
          }
          if (reference.type.includes("_calendar") && originalBookingEvt) {
            const calendar = await getCalendar(credential, "booking");
            if (calendar) {
              integrationsToDelete.push(
                calendar?.deleteEvent(reference.uid, originalBookingEvt, reference.externalCalendarId)
              );
            }
          }
        }
      }
    }

    await Promise.all(integrationsToDelete).then(async () => {
      await prisma.booking.update({
        where: {
          id: originalRescheduledBooking.id,
        },
        data: {
          status: BookingStatus.CANCELLED,
        },
      });
    });
    deletedReferences = true;
  }
  return deletedReferences;
};

export default lastAttendeeDeleteBooking;
