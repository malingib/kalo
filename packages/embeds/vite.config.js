const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });

const vercelUrl =
  process.env.VERCEL_URL && process.env.VERCEL_URL !== "undefined" ? process.env.VERCEL_URL : undefined;

process.env.EMBED_PUBLIC_VERCEL_URL = vercelUrl ?? "";
process.env.EMBED_PUBLIC_WEBAPP_URL =
  process.env.NEXT_PUBLIC_WEBAPP_URL || (vercelUrl ? `https://${vercelUrl}` : "http://localhost:3000");
process.env.EMBED_PUBLIC_EMBED_LIB_URL =
  process.env.NEXT_PUBLIC_EMBED_LIB_URL || `${process.env.EMBED_PUBLIC_WEBAPP_URL}/embed/embed.js`;
// eslint-disable-next-line turbo/no-undeclared-env-vars
process.env.EMBED_PUBLIC_EMBED_FINGER_PRINT = process.env.NEXT_PUBLIC_EMBED_FINGER_PRINT;
// eslint-disable-next-line turbo/no-undeclared-env-vars
process.env.EMBED_PUBLIC_EMBED_VERSION = process.env.NEXT_PUBLIC_EMBED_VERSION;

const viteBaseConfig = {
  envPrefix: "EMBED_PUBLIC_",
};
export default viteBaseConfig;
export const embedCoreEnvVars = {
  EMBED_PUBLIC_EMBED_FINGER_PRINT: process.env.EMBED_PUBLIC_EMBED_FINGER_PRINT ?? "",
  EMBED_PUBLIC_EMBED_VERSION: process.env.EMBED_PUBLIC_EMBED_VERSION ?? "",
  EMBED_PUBLIC_VERCEL_URL: process.env.EMBED_PUBLIC_VERCEL_URL ?? "",
  EMBED_PUBLIC_EMBED_LIB_URL: process.env.EMBED_PUBLIC_EMBED_LIB_URL ?? "",
  NEXT_PUBLIC_IS_E2E: process.env.NEXT_PUBLIC_IS_E2E ?? "",
  EMBED_PUBLIC_WEBAPP_URL: process.env.EMBED_PUBLIC_WEBAPP_URL ?? "http://localhost:3000",
};
