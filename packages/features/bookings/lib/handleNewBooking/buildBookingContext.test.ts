import { describe, expect, it } from "vitest";
import { buildBookingContext } from "./buildBookingContext";

describe("buildBookingContext", () => {
  it("builds the context needed for booking orchestration", () => {
    const context = buildBookingContext({
      eventType: {
        team: { parentId: 99 },
        parent: { team: { parentId: 100 } },
        owner: { profiles: [{ organizationId: 101 }] },
      },
      bookingData: {
        eventTypeId: 42,
        eventTypeSlug: "demo",
        name: "Ada Lovelace",
        email: "ada@example.com",
        attendeePhoneNumber: "+15551234567",
      },
      reqBody: {
        user: ["team-member"],
        teamMemberEmail: "owner@example.com",
        skipContactOwner: false,
        rescheduleUid: null,
        routedTeamMemberIds: [7],
      },
    });

    expect(context).toMatchObject({
      eventTypeId: 42,
      eventTypeSlug: "demo",
      eventTypeOrganizationId: 99,
      bookerName: "Ada Lovelace",
      bookerEmail: "ada@example.com",
      bookerPhoneNumber: "+15551234567",
      dynamicUserList: ["team-member"],
      fullName: "Ada Lovelace",
      contactOwnerFromReq: "owner@example.com",
      contactOwnerEmail: "owner@example.com",
      skipContactOwner: false,
    });
  });

  it("uses the first available organization id when team parent is absent", () => {
    const context = buildBookingContext({
      eventType: {
        team: null,
        parent: null,
        owner: { profiles: [{ organizationId: 555 }] },
      },
      bookingData: {
        eventTypeId: 20,
        eventTypeSlug: "single",
        name: "Grace Hopper",
        email: "grace@example.com",
      },
      reqBody: {
        user: "grace",
        skipContactOwner: true,
      },
    });

    expect(context.eventTypeOrganizationId).toBe(555);
    expect(context.contactOwnerEmail).toBeNull();
    expect(context.dynamicUserList).toEqual(["grace"]);
  });
});
