ALTER TABLE "users" ALTER COLUMN "monthly_token_allowance" SET DEFAULT 1000;
UPDATE "users"
SET "monthly_token_allowance" = 1000
WHERE "plan_type" = 'free';
