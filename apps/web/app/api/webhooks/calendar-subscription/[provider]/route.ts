import { BookingRepository } from "@kalo/features/bookings/repositories/BookingRepository";
import type { CalendarSubscriptionProvider } from "@kalo/features/calendar-subscription/adapters/AdaptersFactory";
import { DefaultAdapterFactory } from "@kalo/features/calendar-subscription/adapters/AdaptersFactory";
import { CalendarSubscriptionService } from "@kalo/features/calendar-subscription/lib/CalendarSubscriptionService";
import { CalendarCacheEventRepository } from "@kalo/features/calendar-subscription/lib/cache/CalendarCacheEventRepository";
import { CalendarCacheEventService } from "@kalo/features/calendar-subscription/lib/cache/CalendarCacheEventService";
import { CalendarSyncService } from "@kalo/features/calendar-subscription/lib/sync/CalendarSyncService";
import { getFeatureRepository } from "@kalo/features/di/containers/FeatureRepository";
import { getTeamFeatureRepository } from "@kalo/features/di/containers/TeamFeatureRepository";
import { getUserFeatureRepository } from "@kalo/features/di/containers/UserFeatureRepository";
import { SelectedCalendarRepository } from "@kalo/features/selectedCalendar/repositories/SelectedCalendarRepository";
import logger from "@kalo/lib/logger";
import { prisma } from "@kalo/prisma";
import { defaultResponderForAppDir } from "@kalo/web/app/api/defaultResponderForAppDir";
import type { Params } from "app/_types";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const log = logger.getSubLogger({ prefix: ["calendar-webhook"] });

function extractAndValidateProviderFromParams(params: Params): CalendarSubscriptionProvider | null {
  if (!("provider" in params)) {
    return null;
  }
  const { provider } = params;
  if (provider === "google_calendar" || provider === "office365_calendar") {
    return provider;
  }
  return null;
}

/**
 * Handles incoming POST requests for calendar webhooks.
 * It processes the webhook based on the calendar provider specified in the URL.
 * If the provider is unsupported, it returns a 400 response.
 * If the webhook is processed successfully, it returns a 200 response.
 * In case of errors during processing, it returns a 500 response with the error message.
 * @param {NextRequest} request - The incoming request object.
 * @param {Object} context - The context object containing route parameters.
 * @param {Promise<Params>} context.params - A promise that resolves to the route parameters.
 * @returns {Promise<NextResponse>} - A promise that resolves to the response object.
 */
async function postHandler(request: NextRequest, ctx: { params: Promise<Params> }) {
  const providerFromParams = extractAndValidateProviderFromParams(await ctx.params);
  if (!providerFromParams) {
    return NextResponse.json({ message: "Unsupported provider" }, { status: 400 });
  }

  try {
    // instantiate dependencies
    const bookingRepository = new BookingRepository(prisma);
    const calendarSyncService = new CalendarSyncService({
      bookingRepository,
    });
    const calendarCacheEventRepository = new CalendarCacheEventRepository(prisma);
    const calendarCacheEventService = new CalendarCacheEventService({
      calendarCacheEventRepository,
    });

    const calendarSubscriptionService = new CalendarSubscriptionService({
      adapterFactory: new DefaultAdapterFactory(),
      selectedCalendarRepository: new SelectedCalendarRepository(prisma),
      featureRepository: getFeatureRepository(),
      teamFeatureRepository: getTeamFeatureRepository(),
      userFeatureRepository: getUserFeatureRepository(),
      calendarSyncService,
      calendarCacheEventService,
    });

    // are features globally enabled
    const [isCacheEnabled, isSyncEnabled] = await Promise.all([
      calendarSubscriptionService.isCacheEnabled(),
      calendarSubscriptionService.isSyncEnabled(),
    ]);

    if (!isCacheEnabled && !isSyncEnabled) {
      log.debug("No cache or sync enabled");
      return NextResponse.json({ message: "No cache or sync enabled" }, { status: 200 });
    }

    await calendarSubscriptionService.processWebhook(providerFromParams, request);
    return NextResponse.json({ message: "Webhook processed" }, { status: 200 });
  } catch (error) {
    log.error("Error processing webhook", { error });
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export const POST = defaultResponderForAppDir(postHandler);
