ALTER TABLE "users"
ADD COLUMN "mpesaShortcodeType" TEXT NOT NULL DEFAULT 'PAYBILL';

ALTER TABLE "users"
ADD CONSTRAINT "users_mpesaShortcodeType_check"
CHECK ("mpesaShortcodeType" IN ('PAYBILL', 'BUY_GOODS'));
