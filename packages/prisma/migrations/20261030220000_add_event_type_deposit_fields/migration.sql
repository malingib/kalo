-- Keep the event-type deposit fields in sync with schema.prisma.
ALTER TABLE "EventType"
  ADD COLUMN IF NOT EXISTS "depositAmount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "depositType" TEXT NOT NULL DEFAULT 'FIXED_KES';
