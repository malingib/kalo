CREATE TABLE "MPesaSubscription" (
  "id" TEXT NOT NULL,
  "userId" INTEGER,
  "teamId" INTEGER,
  "subscriptionType" TEXT NOT NULL,
  "planName" TEXT NOT NULL,
  "username" TEXT,
  "amountKes" INTEGER NOT NULL,
  "phoneNumber" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "currentPeriodStart" TIMESTAMP(3),
  "currentPeriodEnd" TIMESTAMP(3),
  "nextBillingAt" TIMESTAMP(3),
  "lastPaymentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MPesaSubscription_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "MPesaTransaction" ADD COLUMN "subscriptionId" TEXT;

CREATE INDEX "MPesaSubscription_userId_status_idx"
ON "MPesaSubscription"("userId", "status");
CREATE INDEX "MPesaSubscription_teamId_status_idx"
ON "MPesaSubscription"("teamId", "status");
CREATE INDEX "MPesaSubscription_nextBillingAt_status_idx"
ON "MPesaSubscription"("nextBillingAt", "status");

ALTER TABLE "MPesaSubscription"
ADD CONSTRAINT "MPesaSubscription_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MPesaSubscription"
ADD CONSTRAINT "MPesaSubscription_teamId_fkey"
FOREIGN KEY ("teamId") REFERENCES "Team"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MPesaTransaction"
ADD CONSTRAINT "MPesaTransaction_subscriptionId_fkey"
FOREIGN KEY ("subscriptionId") REFERENCES "MPesaSubscription"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
