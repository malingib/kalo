import type { TGetTranscriptAccessLink } from "@kalo/app-store/dailyvideo/zod";
import getWebhooks from "@kalo/features/webhooks/lib/getWebhooks";
import sendPayload from "@kalo/features/webhooks/lib/sendOrSchedulePayload";
import type { EventPayloadType } from "@kalo/features/webhooks/lib/sendPayload";
import getOrgIdFromMemberOrTeamId from "@kalo/lib/getOrgIdFromMemberOrTeamId";
import logger from "@kalo/lib/logger";
import { safeStringify } from "@kalo/lib/safeStringify";
import { WebhookTriggerEvents } from "@kalo/prisma/enums";
import type { CalendarEvent } from "@kalo/types/Calendar";

const log = logger.getSubLogger({ prefix: ["daily-video-webhook-handler:triggerRecordingReadyWebhook"] });

type Booking = {
  userId: number | undefined;
  eventTypeId: number | null;
  eventTypeParentId: number | null | undefined;
  teamId?: number | null;
};

const getWebhooksByEventTrigger = async (eventTrigger: WebhookTriggerEvents, booking: Booking) => {
  const isTeamBooking = booking.teamId;
  const isBookingForManagedEventtype = booking.teamId && booking.eventTypeParentId;
  const triggerForUser = !isTeamBooking || isBookingForManagedEventtype;
  const organizerUserId = triggerForUser ? booking.userId : null;
  const orgId = await getOrgIdFromMemberOrTeamId({ memberId: organizerUserId, teamId: booking.teamId });

  const subscriberOptions = {
    userId: organizerUserId,
    eventTypeId: booking.eventTypeId,
    triggerEvent: eventTrigger,
    teamId: booking.teamId,
    orgId,
  };

  return getWebhooks(subscriberOptions);
};

export const triggerRecordingReadyWebhook = async ({
  evt,
  downloadLink,
  booking,
}: {
  evt: CalendarEvent;
  downloadLink: string;
  booking: Booking;
}) => {
  const eventTrigger: WebhookTriggerEvents = "RECORDING_READY";
  const webhooks = await getWebhooksByEventTrigger(eventTrigger, booking);

  log.debug(
    "Webhooks:",
    safeStringify({
      webhooks,
    })
  );

  const payload: EventPayloadType = {
    ...evt,
    downloadLink,
  };

  const promises = webhooks.map((webhook) =>
    sendPayload(webhook.secret, eventTrigger, new Date().toISOString(), webhook, payload).catch((e) => {
      log.error(
        `Error executing webhook for event: ${eventTrigger}, URL: ${webhook.subscriberUrl}, bookingId: ${evt.bookingId}, bookingUid: ${evt.uid}`,
        safeStringify(e)
      );
    })
  );
  await Promise.all(promises);
};

export const triggerTranscriptionGeneratedWebhook = async ({
  evt,
  downloadLinks,
  booking,
}: {
  evt: CalendarEvent;
  downloadLinks?: {
    transcription: TGetTranscriptAccessLink["transcription"];
    recording: string;
  };
  booking: Booking;
}) => {
  const webhooks = await getWebhooksByEventTrigger(
    WebhookTriggerEvents.RECORDING_TRANSCRIPTION_GENERATED,
    booking
  );

  log.debug(
    "Webhooks:",
    safeStringify({
      webhooks,
    })
  );

  const payload: EventPayloadType = {
    ...evt,
    downloadLinks,
  };

  const promises = webhooks.map((webhook) =>
    sendPayload(
      webhook.secret,
      WebhookTriggerEvents.RECORDING_TRANSCRIPTION_GENERATED,
      new Date().toISOString(),
      webhook,
      payload
    ).catch((e) => {
      log.error(
        `Error executing webhook for event: ${WebhookTriggerEvents.RECORDING_TRANSCRIPTION_GENERATED}, URL: ${webhook.subscriberUrl}, bookingId: ${evt.bookingId}, bookingUid: ${evt.uid}`,
        safeStringify(e)
      );
    })
  );
  await Promise.all(promises);
};
