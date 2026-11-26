import { useAppContextWithSchema } from "@kalo/app-store/EventTypeAppContext";
import AppCard from "@kalo/app-store/_components/AppCard";
import type { EventTypeAppCardComponent } from "@kalo/app-store/types";
import { useLocale } from "@kalo/lib/hooks/useLocale";
import { WEBAPP_URL } from "@kalo/lib/constants";
import { usePathname } from "next/navigation";
import useIsAppEnabled from "../../_utils/useIsAppEnabled";
import type { appDataSchema } from "../zod";
import EventTypeAppSettingsInterface from "./EventTypeAppSettingsInterface";

const EventTypeAppCard: EventTypeAppCardComponent = ({ app, eventType, onAppInstallSuccess }) => {
  const { t } = useLocale();
  const pathname = usePathname();
  const { getAppData, setAppData, disabled } = useAppContextWithSchema<typeof appDataSchema>();
  const { enabled, updateEnabled } = useIsAppEnabled(app);
  return (
    <AppCard
      app={app}
      onAppInstallSuccess={onAppInstallSuccess}
      returnTo={`${WEBAPP_URL}${pathname}?tabName=apps`}
      switchChecked={enabled}
      switchOnClick={updateEnabled}
      teamId={eventType.team?.id || undefined}
      disableSwitch={false}>
      <div className="mt-2 text-sm text-subtle">{t("payment")}</div>
      <EventTypeAppSettingsInterface
        disabled={disabled}
        getAppData={getAppData}
        setAppData={setAppData}
        eventType={eventType}
        slug={app.slug}
      />
    </AppCard>
  );
};

export default EventTypeAppCard;
