import type { EventRecurringTabProps } from "@kalo/features/eventtypes/components/tabs/recurring/EventRecurringTab";
import { EventRecurringTab } from "@kalo/features/eventtypes/components/tabs/recurring/EventRecurringTab";

const EventRecurringWebWrapper = (props: EventRecurringTabProps) => {
  return <EventRecurringTab {...props} />;
};

export default EventRecurringWebWrapper;
