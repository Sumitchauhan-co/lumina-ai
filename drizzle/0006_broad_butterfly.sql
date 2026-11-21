ALTER TABLE "subscriptions" ALTER COLUMN "monthly_token_allowance" SET DEFAULT 100000;
UPDATE "subscriptions"
SET "monthly_token_allowance" = 100000
WHERE "plan_type" = 'pro';
UPDATE "users"
SET "monthly_token_allowance" = 100000
WHERE "plan_type" = 'pro';
