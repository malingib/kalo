import { afterEach, describe, expect, it, vi } from "vitest";
import type { TRPCAuthedContext } from "../../../procedures/authedProcedure";

const alertCount = vi.fn();

vi.mock("@kalo/prisma", () => ({
  default: {
    alert: {
      count: alertCount,
    },
  },
}));

describe("getUnreadAlertsCountHandler", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("returns the unread, non-dismissed alert count for the authed user", async () => {
    alertCount.mockResolvedValue(3);
    const { getUnreadAlertsCountHandler } = await import("./alerts.handler");

    const result = await getUnreadAlertsCountHandler({
      ctx: {
        user: {
          id: 42,
          locale: "en",
        },
      } as unknown as TRPCAuthedContext,
    });

    expect(result).toEqual({ count: 3 });
    expect(alertCount).toHaveBeenCalledWith({
      where: { userId: 42, isRead: false, isDismissed: false },
    });
  });

  it("returns zero when the user has no unread alerts", async () => {
    alertCount.mockResolvedValue(0);
    const { getUnreadAlertsCountHandler } = await import("./alerts.handler");

    const result = await getUnreadAlertsCountHandler({
      ctx: {
        user: {
          id: 7,
          locale: "en",
        },
      } as unknown as TRPCAuthedContext,
    });

    expect(result).toEqual({ count: 0 });
  });
});
