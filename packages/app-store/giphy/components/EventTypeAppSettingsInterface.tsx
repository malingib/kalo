import type { EventTypeAppSettingsComponent } from "@kalo/app-store/types";

import SelectGifInput from "./SelectGifInput";

const EventTypeAppSettingsInterface: EventTypeAppSettingsComponent = ({
  getAppData,
  setAppData,
  disabled,
}) => {
  const thankYouPage = getAppData("thankYouPage");

  return (
    <SelectGifInput
      defaultValue={thankYouPage}
      disabled={disabled}
      onChange={(url: string) => {
        setAppData("thankYouPage", url);
      }}
    />
  );
};

export default EventTypeAppSettingsInterface;
