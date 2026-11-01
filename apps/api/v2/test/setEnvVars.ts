/** biome-ignore-all lint/suspicious/noTsIgnore: e2e file */
import type { Environment } from "@/env";
import "dotenv/config";

const env: Partial<Omit<Environment, "NODE_ENV">> = {
  API_URL: "http://localhost",
  API_PORT: "5555",
  DATABASE_URL: "postgresql://postgres:@localhost:5450/calendso",
  DATABASE_READ_URL: "postgresql://postgres:@localhost:5450/calendso",
  DATABASE_WRITE_URL: "postgresql://postgres:@localhost:5450/calendso",
  NEXTAUTH_SECRET: "XF+Hws3A5g2eyWA5uGYYVJ74X+wrCWJ8oWo6kAfU6O8=",
  JWT_SECRET: "XF+Hws3A5g2eyWA5uGYYVJ74X+wrCWJ8oWo6kAfU6O8=",
  LOG_LEVEL: "trace",
  REDIS_URL: "redis://localhost:6379",
  STRIPE_API_KEY: "sk_test_51J4",
  STRIPE_WEBHOOK_SECRET: "whsec_51J4",
  IS_E2E: "true",
  // Keep this aligned with the cal_test_ keys created by ApiKeysRepositoryFixture.
  // The API strips the configured cal_ prefix before hashing the raw key.
  API_KEY_PREFIX: "cal_",
  GET_LICENSE_KEY_URL: "",
  KALO_LICENSE_KEY: "",
  RATE_LIMIT_DEFAULT_TTL_MS: 60000,
  // note(Lauris): setting high limit so that e2e tests themselves are not rate limited
  RATE_LIMIT_DEFAULT_LIMIT: 10000,
  RATE_LIMIT_DEFAULT_BLOCK_DURATION_MS: 60000,
  IS_TEAM_BILLING_ENABLED: false,
  ENABLE_SLOTS_WORKERS: "false",
  SLOTS_WORKER_POOL_SIZE: "0",
};

// Empty GitHub Actions secrets/vars are present as empty strings and must not
// override the deterministic defaults above. Keep only non-empty inherited
// values so CI can use real configured values when supplied, while local test
// defaults remain effective when repository secrets are absent.
const inheritedEnv = Object.fromEntries(
  Object.entries(process.env).filter(([, value]) => value !== "" && value !== undefined)
);

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
process.env = {
  ...env,
  ...inheritedEnv,
  // fake keys for testing
  NEXT_PUBLIC_VAPID_PUBLIC_KEY:
    "BIds0AQJ96xGBjTSMHTOqLBLutQE7Lu32KKdgSdy7A2cS4mKI2cgb3iGkhDJa5Siy-stezyuPm8qpbhmNxdNHMw",
  VAPID_PRIVATE_KEY: "6cJtkASCar5sZWguIAW7OjvyixpBw9p8zL8WDDwk9Jk",
  CALENDSO_ENCRYPTION_KEY: "test-encryption-key-32-bytes-long!!",
  KALO_SERVICE_ACCOUNT_ENCRYPTION_KEY: "test-service-account-key",
  INTEGRATION_TEST_MODE: "true",
  e2e: "true",
  SLOTS_CACHE_TTL: "1",
};
