-- Preserve historical payment records while detaching them from removed gateway apps.
UPDATE "Payment"
SET "appId" = NULL
WHERE "appId" IN ('stripe', 'alby', 'btcpayserver', 'hitpay', 'mock-payment-app', 'paypal');

-- Remove the gateway app records; dependent credentials and app webhooks cascade.
DELETE FROM "App"
WHERE "slug" IN ('stripe', 'alby', 'btcpayserver', 'hitpay', 'mock-payment-app', 'paypal');

-- Remove only the obsolete Stripe customer identifier. Premium status is retained
-- and is now driven by the first-party M-Pesa subscription ledger.
UPDATE "users"
SET "metadata" = "metadata" - 'stripeCustomerId'
WHERE "metadata" ? 'stripeCustomerId';
