import AttendeeAddGuestsEmail from "@kalo/emails/templates/attendee-add-guests-email";
import AttendeeCancelledEmail from "@kalo/emails/templates/attendee-cancelled-email";
import AttendeeDeclinedEmail from "@kalo/emails/templates/attendee-declined-email";
import AttendeeRequestEmail from "@kalo/emails/templates/attendee-request-email";
import AttendeeRescheduledEmail from "@kalo/emails/templates/attendee-rescheduled-email";
import AttendeeScheduledEmail from "@kalo/emails/templates/attendee-scheduled-email";
import AttendeeUpdatedEmail from "@kalo/emails/templates/attendee-updated-email";
import AttendeeVerifyEmail from "@kalo/emails/templates/attendee-verify-email";
import OrganizerAddGuestsEmail from "@kalo/emails/templates/organizer-add-guests-email";
import OrganizerCancelledEmail from "@kalo/emails/templates/organizer-cancelled-email";
import OrganizerReassignedEmail from "@kalo/emails/templates/organizer-reassigned-email";
import OrganizerRequestEmail from "@kalo/emails/templates/organizer-request-email";
import OrganizerRescheduledEmail from "@kalo/emails/templates/organizer-rescheduled-email";
import OrganizerScheduledEmail from "@kalo/emails/templates/organizer-scheduled-email";
import {
  sendChangeOfEmailVerification,
  sendEmailVerificationByCode,
} from "@kalo/features/auth/lib/verifyEmail";
// sendSignupToOrganizationEmail removed (EE/org feature)
// verifyEmailCodeHandler removed (EE/workflows feature)

export { AttendeeVerifyEmail };

export { AttendeeAddGuestsEmail };

export { OrganizerAddGuestsEmail };

export { AttendeeScheduledEmail };

export { OrganizerScheduledEmail };

export { AttendeeDeclinedEmail };

export { AttendeeCancelledEmail };

export { OrganizerCancelledEmail };

export { OrganizerReassignedEmail };

export { OrganizerRescheduledEmail };

export { AttendeeRescheduledEmail };

export { AttendeeUpdatedEmail };

export { OrganizerRequestEmail };

export { AttendeeRequestEmail };

export { sendEmailVerificationByCode };
export { sendChangeOfEmailVerification };

// sendSignupToOrganizationEmail stub — org feature removed
export async function sendSignupToOrganizationEmail(_args: {
  usernameOrEmail: string;
  team: { name: string; slug?: string | null; id?: number; parent?: unknown | null };
  inviterName: string;
  teamId: number;
  isOrg: boolean;
  translation?: unknown;
}): Promise<void> {
  // No-op: organization signup emails are not available in community edition
}

// verifyEmailCodeHandler stub — used by verified-resources service
export async function verifyEmailCodeHandler(_opts: {
  input: { code: string; email: string; teamId?: number };
  ctx?: { user?: { id: number } };
}): Promise<boolean> {
  return false;
}
