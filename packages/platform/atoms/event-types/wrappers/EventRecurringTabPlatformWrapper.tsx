import type { EventRecurringTabProps } from "@kalo/features/eventtypes/components/tabs/recurring/EventRecurringTab";
import { EventRecurringTab } from "@kalo/features/eventtypes/components/tabs/recurring/EventRecurringTab";

const EventRecurringTabPlatformWrapper = (props: EventRecurringTabProps) => {
  return <EventRecurringTab {...props} />;
};

export default EventRecurringTabPlatformWrapper;
