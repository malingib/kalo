-- Reconcile schema objects that were present in schema.prisma but missing
-- from the historical migration chain. Indexes are named as Prisma names them.
ALTER TABLE "Booking"
  ADD COLUMN IF NOT EXISTS "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
  ADD COLUMN IF NOT EXISTS "depositReceiptUrl" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "AlertPreference_userId_key" ON "AlertPreference"("userId");
CREATE INDEX IF NOT EXISTS "Alert_userId_isRead_idx" ON "Alert"("userId", "isRead");
CREATE INDEX IF NOT EXISTS "Alert_userId_type_idx" ON "Alert"("userId", "type");
CREATE INDEX IF NOT EXISTS "Alert_createdAt_idx" ON "Alert"("createdAt");
CREATE INDEX IF NOT EXISTS "AlertPreference_userId_idx" ON "AlertPreference"("userId");

CREATE INDEX IF NOT EXISTS "InventoryItem_vendorUserId_idx" ON "InventoryItem"("vendorUserId");
CREATE INDEX IF NOT EXISTS "InventoryItem_eventTypeId_idx" ON "InventoryItem"("eventTypeId");
CREATE INDEX IF NOT EXISTS "InventoryTransaction_itemId_idx" ON "InventoryTransaction"("itemId");
CREATE INDEX IF NOT EXISTS "InventoryTransaction_bookingUid_idx" ON "InventoryTransaction"("bookingUid");

CREATE UNIQUE INDEX IF NOT EXISTS "MPesaTransaction_mpesaReceiptNumber_key" ON "MPesaTransaction"("mpesaReceiptNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "MPesaTransaction_checkoutRequestId_key" ON "MPesaTransaction"("checkoutRequestId");
CREATE INDEX IF NOT EXISTS "MPesaTransaction_bookingUid_idx" ON "MPesaTransaction"("bookingUid");
CREATE INDEX IF NOT EXISTS "MPesaTransaction_phoneNumber_idx" ON "MPesaTransaction"("phoneNumber");
CREATE INDEX IF NOT EXISTS "MPesaTransaction_checkoutRequestId_idx" ON "MPesaTransaction"("checkoutRequestId");

CREATE UNIQUE INDEX IF NOT EXISTS "Receipt_receiptNumber_key" ON "Receipt"("receiptNumber");
CREATE INDEX IF NOT EXISTS "Receipt_vendorUserId_idx" ON "Receipt"("vendorUserId");
CREATE INDEX IF NOT EXISTS "Receipt_bookingUid_idx" ON "Receipt"("bookingUid");
CREATE INDEX IF NOT EXISTS "Receipt_customerPhone_idx" ON "Receipt"("customerPhone");

CREATE UNIQUE INDEX IF NOT EXISTS "VendorProfile_userId_key" ON "VendorProfile"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "VendorProfile_businessSlug_key" ON "VendorProfile"("businessSlug");
CREATE INDEX IF NOT EXISTS "VendorProfile_businessSlug_idx" ON "VendorProfile"("businessSlug");
CREATE INDEX IF NOT EXISTS "VendorProfile_isApproved_idx" ON "VendorProfile"("isApproved");

CREATE UNIQUE INDEX IF NOT EXISTS "WhatsAppSession_phone_key" ON "WhatsAppSession"("phone");
CREATE INDEX IF NOT EXISTS "WhatsAppSession_userId_idx" ON "WhatsAppSession"("userId");
CREATE INDEX IF NOT EXISTS "WhatsAppMessageLog_userId_customerPhone_idx" ON "WhatsAppMessageLog"("userId", "customerPhone");

DO $$ BEGIN
  ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_vendorUserId_fkey"
    FOREIGN KEY ("vendorUserId") REFERENCES "VendorProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_itemId_fkey"
    FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "MPesaTransaction" ADD CONSTRAINT "MPesaTransaction_bookingUid_fkey"
    FOREIGN KEY ("bookingUid") REFERENCES "Booking"("uid") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "VendorProfile" ADD CONSTRAINT "VendorProfile_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "WhatsAppMessageLog" ADD CONSTRAINT "WhatsAppMessageLog_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "WhatsAppSession" ADD CONSTRAINT "WhatsAppSession_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
