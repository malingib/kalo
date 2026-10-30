-- Add M-Pesa merchant configuration fields used by the user model.
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "mpesaPaybill" TEXT,
  ADD COLUMN IF NOT EXISTS "mpesaTillNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "mpesaShortcode" TEXT,
  ADD COLUMN IF NOT EXISTS "mpesaPasskey" TEXT;
