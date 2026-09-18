import { EventTypeSelectComponent } from "@kalo/features/troubleshooter/components/EventTypeSelectComponent";
import { trpc } from "@kalo/trpc/react";

export { EventTypeSelectComponent };

export function EventTypeSelect(): JSX.Element {
  const { data: eventTypes, isPending } = trpc.viewer.eventTypes.listWithTeam.useQuery();

  return <EventTypeSelectComponent eventTypes={eventTypes ?? []} isPending={isPending} />;
}
