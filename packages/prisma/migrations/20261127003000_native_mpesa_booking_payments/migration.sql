ALTER TABLE "MPesaTransaction"
ADD COLUMN "paymentId" INTEGER;

CREATE UNIQUE INDEX "MPesaTransaction_paymentId_key"
ON "MPesaTransaction"("paymentId");

ALTER TABLE "MPesaTransaction"
ADD CONSTRAINT "MPesaTransaction_paymentId_fkey"
FOREIGN KEY ("paymentId") REFERENCES "Payment"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "App" ("slug", "dirName", "categories", "enabled", "createdAt", "updatedAt")
VALUES ('mpesa', 'mpesa', ARRAY['payment']::"AppCategories"[], TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO UPDATE
SET "dirName" = EXCLUDED."dirName",
    "categories" = EXCLUDED."categories",
    "enabled" = TRUE,
    "updatedAt" = CURRENT_TIMESTAMP;
