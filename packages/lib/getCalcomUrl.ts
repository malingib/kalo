import { WEBAPP_URL, IS_CALCOM } from "./constants";

/** Returns the public URL for the current Kalo instance. */
export const getKaloUrl = () => {
  if (IS_CALCOM) {
    return new URL(WEBAPP_URL).hostname.endsWith("cal.eu") ? "https://cal.eu" : "https://cal.com";
  }
  return WEBAPP_URL;
};

/** @deprecated Use getKaloUrl. Kept for compatibility with existing integrations. */
export const getCalcomUrl = getKaloUrl;
