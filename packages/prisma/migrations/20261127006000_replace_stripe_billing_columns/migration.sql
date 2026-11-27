-- Replace Stripe identifiers with first-party M-Pesa subscription references.
-- Existing paid plans are preserved but require an explicit M-Pesa renewal:
-- Daraja STK requires a customer phone and PIN authorization, neither of which
-- can be inferred or silently migrated from a Stripe subscription.

UPDATE "TeamBilling"
SET "status" = 'MIGRATION_REQUIRED'
WHERE "subscriptionId" IS NOT NULL;

UPDATE "OrganizationBilling"
SET "status" = 'MIGRATION_REQUIRED'
WHERE "subscriptionId" IS NOT NULL;

UPDATE "PlatformBilling"
SET "overdue" = TRUE
WHERE "subscriptionId" IS NOT NULL OR "customerId" IS NOT NULL;

UPDATE "OrganizationOnboarding"
SET "error" = COALESCE("error", 'Payment provider migration required')
WHERE "stripeCustomerId" IS NOT NULL
   OR "stripeSubscriptionId" IS NOT NULL
   OR "stripeSubscriptionItemId" IS NOT NULL;

ALTER TABLE "TeamBilling"
  DROP COLUMN "subscriptionId",
  DROP COLUMN "subscriptionItemId",
  DROP COLUMN "customerId",
  ADD COLUMN "mpesaSubscriptionId" TEXT;

ALTER TABLE "OrganizationBilling"
  DROP COLUMN "subscriptionId",
  DROP COLUMN "subscriptionItemId",
  DROP COLUMN "customerId",
  ADD COLUMN "mpesaSubscriptionId" TEXT;

ALTER TABLE "PlatformBilling"
  DROP CONSTRAINT IF EXISTS "PlatformBilling_customerId_key",
  DROP COLUMN "customerId",
  DROP COLUMN "subscriptionId",
  DROP COLUMN "priceId",
  ADD COLUMN "mpesaSubscriptionId" TEXT;

ALTER TABLE "OrganizationOnboarding"
  DROP CONSTRAINT IF EXISTS "OrganizationOnboarding_stripeCustomerId_key",
  DROP COLUMN "stripeCustomerId",
  DROP COLUMN "stripeSubscriptionId",
  DROP COLUMN "stripeSubscriptionItemId",
  ADD COLUMN "mpesaSubscriptionId" TEXT;

ALTER TABLE "MPesaSubscription"
  ADD COLUMN "billingPeriod" "BillingPeriod",
  ADD COLUMN "billingMode" "BillingMode",
  ADD COLUMN "pricePerSeat" INTEGER,
  ADD COLUMN "paidSeats" INTEGER;

CREATE UNIQUE INDEX "TeamBilling_mpesaSubscriptionId_key"
  ON "TeamBilling"("mpesaSubscriptionId");
CREATE UNIQUE INDEX "OrganizationBilling_mpesaSubscriptionId_key"
  ON "OrganizationBilling"("mpesaSubscriptionId");
CREATE UNIQUE INDEX "PlatformBilling_mpesaSubscriptionId_key"
  ON "PlatformBilling"("mpesaSubscriptionId");
CREATE UNIQUE INDEX "OrganizationOnboarding_mpesaSubscriptionId_key"
  ON "OrganizationOnboarding"("mpesaSubscriptionId");

ALTER TABLE "TeamBilling"
  ADD CONSTRAINT "TeamBilling_mpesaSubscriptionId_fkey"
  FOREIGN KEY ("mpesaSubscriptionId") REFERENCES "MPesaSubscription"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrganizationBilling"
  ADD CONSTRAINT "OrganizationBilling_mpesaSubscriptionId_fkey"
  FOREIGN KEY ("mpesaSubscriptionId") REFERENCES "MPesaSubscription"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrganizationOnboarding"
  ADD CONSTRAINT "OrganizationOnboarding_mpesaSubscriptionId_fkey"
  FOREIGN KEY ("mpesaSubscriptionId") REFERENCES "MPesaSubscription"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
