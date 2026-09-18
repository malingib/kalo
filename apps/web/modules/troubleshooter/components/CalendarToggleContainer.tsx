import { CalendarToggleContainerComponent } from "@kalo/features/troubleshooter/components/CalendarToggleContainerComponent";
import { trpc } from "@kalo/trpc/react";

export function CalendarToggleContainer() {
  const { data, isLoading } = trpc.viewer.calendars.connectedCalendars.useQuery();

  return (
    <CalendarToggleContainerComponent
      connectedCalendars={data?.connectedCalendars ?? []}
      isLoading={isLoading}
      manageCalendarsAction={{ href: "/settings/my-account/calendars" }}
      installCalendarAction={{ href: "/apps/categories/calendar" }}
    />
  );
}
