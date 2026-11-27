-- Cal AI phone number billing no longer uses Stripe subscriptions.
ALTER TABLE "CalAiPhoneNumber"
  DROP COLUMN IF EXISTS "stripeCustomerId",
  DROP COLUMN IF EXISTS "stripeSubscriptionId";
