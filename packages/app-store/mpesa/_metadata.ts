import type { AppMeta } from "@kalo/types/App";

export const metadata = {
  name: "M-Pesa",
  description: "Native Safaricom Daraja STK Push payments for KALO bookings.",
  installed: true,
  slug: "mpesa",
  category: "payment",
  categories: ["payment"],
  logo: "icon.svg",
  publisher: "KALO",
  title: "M-Pesa",
  type: "mpesa_payment",
  url: "https://developer.safaricom.co.ke/",
  docsUrl: "https://developer.safaricom.co.ke/",
  variant: "payment",
  extendsFeature: "EventType",
  email: "support@kalo",
  dirName: "mpesa",
  isOAuth: false,
  isGlobal: true,
} as AppMeta;

export default metadata;
