import React from "react";

import type { EventSetupTabProps } from "@kalo/web/modules/event-types/components/tabs/setup/EventSetupTab";
import { EventSetupTab } from "@kalo/web/modules/event-types/components/tabs/setup/EventSetupTab";

const EventSetupTabPlatformWrapper = (props: EventSetupTabProps) => {
  return <EventSetupTab {...props} urlPrefix="" hasOrgBranding={false} />;
};

export default EventSetupTabPlatformWrapper;
