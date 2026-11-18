import { getRedisService } from "@kalo/features/di/containers/Redis";
import logger from "@kalo/lib/logger";

/**
 * Bump the availability-cache generation after a booking mutation.
 * The booking/cancellation itself is already committed, so cache invalidation
 * must not turn a successful mutation into a failed request that could be retried.
 */
export async function invalidateSlotsCache(eventTypeId?: number | null): Promise<void> {
  if (!eventTypeId) return;

  try {
    await getRedisService().incr(`slots:version:${eventTypeId}`);
  } catch (error) {
    logger.error("Failed to invalidate available-slots cache", {
      eventTypeId,
      error,
    });
  }
}
