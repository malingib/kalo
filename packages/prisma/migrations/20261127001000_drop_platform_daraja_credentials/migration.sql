-- Daraja credentials and callback configuration are runtime secrets.
-- The application reads them from server-only environment variables; they must
-- not be persisted or returned by the platform settings API.
ALTER TABLE "PlatformSettings"
  DROP COLUMN IF EXISTS "darajaConsumerKey",
  DROP COLUMN IF EXISTS "darajaConsumerSecret",
  DROP COLUMN IF EXISTS "darajaShortcode",
  DROP COLUMN IF EXISTS "darajaPasskey",
  DROP COLUMN IF EXISTS "darajaCallbackUrl",
  DROP COLUMN IF EXISTS "darajaIsSandbox";
