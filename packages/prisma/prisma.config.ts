import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { defineConfig } from "prisma/config";

// Prisma 6 does not auto-load .env files when a prisma.config.ts is present.
// The monorepo keeps DATABASE_URL / DATABASE_DIRECT_URL in the repo-root .env.
// process.loadEnvFile is a Node built-in (>= 20.6), so no extra dependency.
const rootEnvPath = path.join(__dirname, "../../.env");
if (fs.existsSync(rootEnvPath)) {
  process.loadEnvFile(rootEnvPath);
}

export default defineConfig({
  schema: path.join(__dirname, "schema.prisma"),
  migrations: {
    path: path.join(__dirname, "migrations"),
  },
});
