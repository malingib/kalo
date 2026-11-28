-- Alert vendors and workspace owners when a Daraja payment cannot be safely auto-confirmed.
ALTER TYPE "AlertType" ADD VALUE IF NOT EXISTS 'PAYMENT_RECONCILIATION_REQUIRED';
