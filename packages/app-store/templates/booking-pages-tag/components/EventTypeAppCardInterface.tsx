import { useState } from "react";

import { useAppContextWithSchema } from "@kalo/app-store/EventTypeAppContext";
import AppCard from "@kalo/app-store/_components/AppCard";
import type { EventTypeAppCardComponent } from "@kalo/app-store/types";
import { TextField } from "@kalo/ui/components/form";

import type { appDataSchema } from "../zod";

const EventTypeAppCard: EventTypeAppCardComponent = function EventTypeAppCard({ app, eventType, onAppInstallSuccess }) {
  const { getAppData, setAppData } = useAppContextWithSchema<typeof appDataSchema>();
  const trackingId = getAppData("trackingId");
  const [enabled, setEnabled] = useState(getAppData("enabled"));

  return (
    <AppCard
      onAppInstallSuccess={onAppInstallSuccess}
      app={app}
      switchOnClick={(e) => {
        if (!e) {
          setEnabled(false);
        } else {
          setEnabled(true);
        }
      }}
      switchChecked={enabled}
      teamId={eventType.team?.id || undefined}>
      <TextField
        name="Tracking ID"
        value={trackingId}
        onChange={(e) => {
          setAppData("trackingId", e.target.value);
        }}
      />
    </AppCard>
  );
};

export default EventTypeAppCard;
