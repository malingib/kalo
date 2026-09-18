import type { LocationObject } from "@kalo/app-store/locations";
import { locationKeyToString } from "@kalo/app-store/locations";
import { getLocationByType } from "@kalo/app-store/locations";
import { getTranslatedLocation } from "@kalo/app-store/locations";
import type { useLocale } from "@kalo/lib/hooks/useLocale";
import notEmpty from "@kalo/lib/notEmpty";

export default function getLocationsOptionsForSelect(
  locations: LocationObject[],
  t: ReturnType<typeof useLocale>["t"]
) {
  return locations
    .map((location) => {
      const eventLocation = getLocationByType(location.type);
      const locationString = locationKeyToString(location);

      if (typeof locationString !== "string" || !eventLocation) {
        // It's possible that location app got uninstalled
        return null;
      }
      const type = eventLocation.type;
      const translatedLocation = location.customLabel || getTranslatedLocation(location, eventLocation, t);

      return {
        // XYZ: is considered a namespace in i18next https://www.i18next.com/principles/namespaces and thus it gets cleaned up.
        label: translatedLocation || locationString,
        value: type,
        inputPlaceholder: t(eventLocation?.attendeeInputPlaceholder || ""),
      };
    })
    .filter(notEmpty);
}
