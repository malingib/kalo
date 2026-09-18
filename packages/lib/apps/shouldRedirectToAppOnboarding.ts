import type { AppMeta } from "@kalo/types/App";

export const shouldRedirectToAppOnboarding = (appMetadata: AppMeta) => {
  const hasEventTypes = appMetadata?.extendsFeature === "EventType";
  return hasEventTypes;
};
