import type { AppMeta } from "@kalo/types/App";

export const metadata = {
  name: "Microsoft Exchange 2013 Calendar",
  description: "For calendars hosted on on-premises Microsoft Exchange 2013 servers",
  installed: true,
  type: "exchange2013_calendar",
  title: "Microsoft Exchange 2013 Calendar",
  variant: "calendar",
  category: "calendar",
  categories: ["calendar"],
  label: "Exchange Calendar",
  logo: "icon.svg",
  publisher: "Kalo",
  slug: "exchange2013-calendar",
  url: "https://cal.com/",
  email: "help@kalo",
  dirName: "exchange2013calendar",
  isOAuth: false,
} as AppMeta;

export default metadata;
