import type { AppMeta } from "@kalo/types/App";

export const metadata = {
  name: "Apple Calendar",
  description:
    "Apple calendar runs both the macOS and iOS mobile operating systems. Offering online cloud backup of calendars using Apple's iCloud service, it can sync with Google Calendar and Microsoft Exchange Server. Users can schedule events in their day that include time, location, duration, and extra notes.",
  installed: true,
  type: "apple_calendar",
  title: "Apple Calendar",
  variant: "calendar",
  categories: ["calendar"],
  category: "calendar",
  logo: "icon.svg",
  publisher: "Kalo",
  slug: "apple-calendar",
  url: "https://cal.com/",
  email: "help@kalo",
  dirName: "applecalendar",
  isOAuth: false,
} as AppMeta;

export default metadata;
