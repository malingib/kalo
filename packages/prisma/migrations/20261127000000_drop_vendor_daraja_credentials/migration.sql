-- Vendor Daraja credentials were never used by the active STK flow.
-- The active WhatsApp booking flow uses User.mpesaShortcode/mpesaPasskey
-- with platform-managed consumer credentials. Remove legacy plaintext columns.
ALTER TABLE "VendorProfile"
  DROP COLUMN IF EXISTS "darajaConsumerKey",
  DROP COLUMN IF EXISTS "darajaConsumerSecret",
  DROP COLUMN IF EXISTS "darajaShortcode",
  DROP COLUMN IF EXISTS "darajaPasskey";
