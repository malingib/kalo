import { DynamicComponent } from "@kalo/app-store/_components/DynamicComponent";
import dynamic from "next/dynamic";

// Only Google Calendar is available for new generic setup flows. M-Pesa uses
// its dedicated payment configuration UI; legacy integrations are retired.
export const AppSetupMap = {
  "google-calendar": dynamic(() => import("@kalo/web/components/apps/googlecalendar/Setup")),
};

export const AppSetupPage = (props: { slug: string }) => {
  return <DynamicComponent<typeof AppSetupMap> componentMap={AppSetupMap} {...props} />;
};

export default AppSetupPage;
