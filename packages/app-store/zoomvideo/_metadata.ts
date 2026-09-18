import type { AppMeta } from "@kalo/types/App";

export const metadata = {
  linkType: "dynamic",
  name: "Zoom Video",
  description:
    "Zoom is a secure and reliable video platform that supports all of your online communication needs. It can provide everything from one on one meetings, chat, phone, webinars, and large-scale online events. Available with both desktop, web, and mobile versions.",
  type: "zoom_video",
  categories: ["conferencing"],
  variant: "conferencing",
  logo: "icon.svg",
  publisher: "Kalo",
  url: "https://zoom.us/",
  category: "conferencing",
  slug: "zoom",
  title: "Zoom Video",
  email: "help@kalo",
  appData: {
    location: {
      default: false,
      linkType: "dynamic",
      type: "integrations:zoom",
      label: "Zoom Video",
    },
  },
  dirName: "zoomvideo",
  isOAuth: true,
} as AppMeta;

export default metadata;
