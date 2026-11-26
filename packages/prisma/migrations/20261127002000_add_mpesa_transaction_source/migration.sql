-- Tag the integration that initiated each STK transaction so callback
-- handling can keep WhatsApp conversation side-effects out of generic flows.
ALTER TABLE "MPesaTransaction"
  ADD COLUMN "source" TEXT NOT NULL DEFAULT 'whatsapp-bot';
