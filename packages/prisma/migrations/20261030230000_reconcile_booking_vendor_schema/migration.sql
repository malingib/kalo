-- Reconcile schema objects introduced by the Kalo vendor-commerce feature.
-- These tables were absent from the historical migration chain, so create them
-- before adding indexes and relationships. All DDL is safe on a fresh database.
ALTER TABLE "Booking"
  ADD COLUMN IF NOT EXISTS "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
  ADD COLUMN IF NOT EXISTS "depositReceiptUrl" TEXT;

DO $$ BEGIN
  CREATE TYPE "InventoryTxType" AS ENUM ('STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT', 'WRITE_OFF');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE "AlertType" AS ENUM ('LOW_STOCK', 'NEW_BOOKING', 'PAYMENT_RECEIVED', 'BOOKING_CANCELLED', 'BOOKING_REMINDER', 'DEPOSIT_OVERDUE', 'VENDOR_APPROVAL_NEEDED', 'PLATFORM_ANNOUNCEMENT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE "AlertChannel" AS ENUM ('IN_APP', 'WHATSAPP', 'EMAIL', 'SMS');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "PlatformSettings" (
  "id" SERIAL PRIMARY KEY,
  "platformFeePercent" DOUBLE PRECISION NOT NULL DEFAULT 3.0,
  "platformFeeCurrency" TEXT NOT NULL DEFAULT 'KES',
  "subscriptionPlans" JSONB,
  "darajaConsumerKey" TEXT,
  "darajaConsumerSecret" TEXT,
  "darajaShortcode" TEXT,
  "darajaPasskey" TEXT,
  "darajaCallbackUrl" TEXT,
  "darajaIsSandbox" BOOLEAN NOT NULL DEFAULT TRUE,
  "centralWhatsappPhone" TEXT,
  "centralWhatsappEnabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "requireVendorApproval" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "VendorProfile" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "userId" INTEGER NOT NULL UNIQUE,
  "businessName" TEXT,
  "businessSlug" TEXT UNIQUE,
  "businessBio" TEXT,
  "logoUrl" TEXT,
  "coverImageUrl" TEXT,
  "locationText" TEXT,
  "locationLat" DOUBLE PRECISION,
  "locationLng" DOUBLE PRECISION,
  "currency" TEXT NOT NULL DEFAULT 'KES',
  "timezone" TEXT NOT NULL DEFAULT 'Africa/Nairobi',
  "planSlug" TEXT NOT NULL DEFAULT 'basic',
  "isApproved" BOOLEAN NOT NULL DEFAULT FALSE,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "mpesaTillNumber" TEXT,
  "mpesaPaybill" TEXT,
  "mpesaAccountName" TEXT,
  "mpesaPayoutPhone" TEXT,
  "darajaConsumerKey" TEXT,
  "darajaConsumerSecret" TEXT,
  "darajaShortcode" TEXT,
  "darajaPasskey" TEXT,
  "whatsappEnabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "whatsappGreeting" TEXT,
  "whatsappFaqJson" JSONB,
  "whatsappOfflineMessage" TEXT,
  "whatsappAutoConfirm" BOOLEAN NOT NULL DEFAULT FALSE,
  "operatingHoursJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "InventoryItem" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "vendorUserId" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "sku" TEXT,
  "description" TEXT,
  "unit" TEXT NOT NULL DEFAULT 'pcs',
  "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "lowStockAlert" DOUBLE PRECISION NOT NULL DEFAULT 5,
  "costPrice" DOUBLE PRECISION,
  "salePrice" DOUBLE PRECISION,
  "imageUrl" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "eventTypeId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "InventoryTransaction" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "itemId" TEXT NOT NULL,
  "type" "InventoryTxType" NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL,
  "note" TEXT,
  "bookingUid" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "MPesaTransaction" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "bookingUid" TEXT,
  "phoneNumber" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "mpesaReceiptNumber" TEXT UNIQUE,
  "checkoutRequestId" TEXT UNIQUE,
  "merchantRequestId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "resultDesc" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Receipt" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "receiptNumber" TEXT NOT NULL UNIQUE,
  "bookingUid" TEXT,
  "vendorUserId" INTEGER NOT NULL,
  "customerPhone" TEXT,
  "customerName" TEXT,
  "customerEmail" TEXT,
  "lineItemsJson" JSONB NOT NULL,
  "subtotal" DOUBLE PRECISION NOT NULL,
  "platformFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "depositPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalAmount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'KES',
  "mpesaReceiptNumber" TEXT,
  "paymentMethod" TEXT NOT NULL DEFAULT 'M-Pesa',
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentViaWhatsapp" BOOLEAN NOT NULL DEFAULT FALSE,
  "sentViaEmail" BOOLEAN NOT NULL DEFAULT FALSE,
  "pdfUrl" TEXT
);

CREATE TABLE IF NOT EXISTS "WhatsAppSession" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  "phone" TEXT NOT NULL UNIQUE,
  "sessionData" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DISCONNECTED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "WhatsAppMessageLog" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  "customerPhone" TEXT NOT NULL,
  "direction" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "state" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Alert" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  "type" "AlertType" NOT NULL,
  "channel" "AlertChannel" NOT NULL DEFAULT 'IN_APP',
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "isRead" BOOLEAN NOT NULL DEFAULT FALSE,
  "isDismissed" BOOLEAN NOT NULL DEFAULT FALSE,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "AlertPreference" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "userId" INTEGER NOT NULL UNIQUE,
  "prefsJson" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE INDEX IF NOT EXISTS "Alert_userId_isRead_idx" ON "Alert"("userId", "isRead");
CREATE INDEX IF NOT EXISTS "Alert_userId_type_idx" ON "Alert"("userId", "type");
CREATE INDEX IF NOT EXISTS "Alert_createdAt_idx" ON "Alert"("createdAt");
CREATE INDEX IF NOT EXISTS "AlertPreference_userId_idx" ON "AlertPreference"("userId");
CREATE INDEX IF NOT EXISTS "InventoryItem_vendorUserId_idx" ON "InventoryItem"("vendorUserId");
CREATE INDEX IF NOT EXISTS "InventoryItem_eventTypeId_idx" ON "InventoryItem"("eventTypeId");
CREATE INDEX IF NOT EXISTS "InventoryTransaction_itemId_idx" ON "InventoryTransaction"("itemId");
CREATE INDEX IF NOT EXISTS "InventoryTransaction_bookingUid_idx" ON "InventoryTransaction"("bookingUid");
CREATE INDEX IF NOT EXISTS "MPesaTransaction_bookingUid_idx" ON "MPesaTransaction"("bookingUid");
CREATE INDEX IF NOT EXISTS "MPesaTransaction_phoneNumber_idx" ON "MPesaTransaction"("phoneNumber");
CREATE INDEX IF NOT EXISTS "MPesaTransaction_checkoutRequestId_idx" ON "MPesaTransaction"("checkoutRequestId");
CREATE INDEX IF NOT EXISTS "Receipt_vendorUserId_idx" ON "Receipt"("vendorUserId");
CREATE INDEX IF NOT EXISTS "Receipt_bookingUid_idx" ON "Receipt"("bookingUid");
CREATE INDEX IF NOT EXISTS "Receipt_customerPhone_idx" ON "Receipt"("customerPhone");
CREATE INDEX IF NOT EXISTS "VendorProfile_businessSlug_idx" ON "VendorProfile"("businessSlug");
CREATE INDEX IF NOT EXISTS "VendorProfile_isApproved_idx" ON "VendorProfile"("isApproved");
CREATE INDEX IF NOT EXISTS "WhatsAppSession_userId_idx" ON "WhatsAppSession"("userId");
CREATE INDEX IF NOT EXISTS "WhatsAppMessageLog_userId_customerPhone_idx" ON "WhatsAppMessageLog"("userId", "customerPhone");

DO $$ BEGIN
  ALTER TABLE "VendorProfile" ADD CONSTRAINT "VendorProfile_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
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
  ALTER TABLE "WhatsAppMessageLog" ADD CONSTRAINT "WhatsAppMessageLog_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "WhatsAppSession" ADD CONSTRAINT "WhatsAppSession_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
