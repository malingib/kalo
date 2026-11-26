-- Existing M-Pesa records were created by the WhatsApp bot. Preserve their
-- callback behavior while making new, untagged transactions generic by default.
ALTER TABLE "MPesaTransaction"
  ADD COLUMN "source" TEXT NOT NULL DEFAULT 'platform';

UPDATE "MPesaTransaction"
SET "source" = 'whatsapp-bot';

ALTER TABLE "MPesaTransaction"
  ALTER COLUMN "source" SET DEFAULT 'platform';
