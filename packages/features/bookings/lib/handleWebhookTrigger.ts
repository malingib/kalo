import getWebhooks from "@kalo/features/webhooks/lib/getWebhooks";
import type { GetSubscriberOptions } from "@kalo/features/webhooks/lib/getWebhooks";
import sendPayload from "@kalo/features/webhooks/lib/sendOrSchedulePayload";
import { isEventPayload, type WebhookPayloadType } from "@kalo/features/webhooks/lib/sendPayload";
import { safeStringify } from "@kalo/lib/safeStringify";
import { withReporting } from "@kalo/lib/sentryWrapper";
import type { TraceContext } from "@kalo/lib/tracing";
import { distributedTracing } from "@kalo/lib/tracing/factory";

async function _handleWebhookTrigger(args: {
  subscriberOptions: GetSubscriberOptions;
  eventTrigger: string;
  webhookData: WebhookPayloadType;
  isDryRun?: boolean;
  traceContext: TraceContext;
}) {
  const spanContext = distributedTracing.createSpan(args.traceContext, "webhook_trigger", {
    eventTrigger: args.eventTrigger || "unknown",
  });

  const tracingLogger = distributedTracing.getTracingLogger(spanContext);
  try {
    if (args.isDryRun) return;

    const subscribers = await getWebhooks(args.subscriberOptions);

    const promises = subscribers.map((sub) =>
      sendPayload(sub.secret, args.eventTrigger, new Date().toISOString(), sub, args.webhookData).catch(
        (e) => {
          if (isEventPayload(args.webhookData)) {
            tracingLogger.error(
              `Error executing webhook for event: ${args.eventTrigger}, URL: ${sub.subscriberUrl}, booking id: ${args.webhookData.bookingId}, booking uid: ${args.webhookData.uid}`,
              safeStringify(e)
            );
          }
        }
      )
    );
    await Promise.all(promises);
  } catch (error) {
    tracingLogger.error("Error while sending webhook", error);
  }
}

export const handleWebhookTrigger = withReporting(_handleWebhookTrigger, "handleWebhookTrigger");
