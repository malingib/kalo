import type { AppMeta } from "@kalo/types/App";

export const metadata = {
  name: "Microsoft Exchange 2016 Calendar",
  description: "For calendars hosted on on-premises Microsoft Exchange 2016 servers",
  installed: true,
  type: "exchange2016_calendar",
  title: "Microsoft Exchange 2016 Calendar",
  variant: "calendar",
  category: "calendar",
  categories: ["calendar"],
  label: "Exchange Calendar",
  logo: "icon.svg",
  publisher: "Kalo",
  slug: "exchange2016-calendar",
  url: "https://cal.com/",
  email: "help@kalo",
  dirName: "exchange2016calendar",
  isOAuth: false,
} as AppMeta;

export default metadata;
