-- Expand-only migration. It is intentionally safe for the legacy application.
SET lock_timeout = '5s';
SET statement_timeout = '15min';

ALTER TYPE "billing"."WebhookEventStatus" ADD VALUE IF NOT EXISTS 'received' BEFORE 'processed';
ALTER TYPE "billing"."WebhookEventStatus" ADD VALUE IF NOT EXISTS 'processing' BEFORE 'processed';

ALTER TABLE "billing"."customer"
  ADD COLUMN IF NOT EXISTS "user_id" TEXT,
  ADD COLUMN IF NOT EXISTS "organization_id" TEXT;

ALTER TABLE "billing"."webhook_event"
  ADD COLUMN IF NOT EXISTS "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "last_attempt_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "attempt_count" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "billing"."webhook_event"
  ALTER COLUMN "processed_at" DROP DEFAULT,
  ALTER COLUMN "processed_at" DROP NOT NULL;

UPDATE "billing"."webhook_event"
SET
  "received_at" = COALESCE("processed_at", CURRENT_TIMESTAMP),
  "last_attempt_at" = COALESCE("processed_at", CURRENT_TIMESTAMP),
  "attempt_count" = GREATEST("attempt_count", 1)
WHERE "attempt_count" = 0 OR "last_attempt_at" IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "public"."member"
    GROUP BY "organization_id", "user_id"
    HAVING COUNT(DISTINCT "role") > 1
  ) THEN
    RAISE EXCEPTION 'conflicting duplicate member roles detected; aborting migration';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "public"."organization_role"
    GROUP BY "organization_id", "role"
    HAVING COUNT(DISTINCT "permission") > 1
  ) THEN
    RAISE EXCEPTION 'conflicting duplicate organization role permissions detected; aborting migration';
  END IF;
END $$;

WITH ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "organization_id", "user_id"
      ORDER BY "created_at", "id"
    ) AS row_number
  FROM "public"."member"
)
DELETE FROM "public"."member" AS member
USING ranked
WHERE member."id" = ranked."id" AND ranked.row_number > 1;

WITH ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "organization_id", "role"
      ORDER BY "created_at", "id"
    ) AS row_number
  FROM "public"."organization_role"
)
DELETE FROM "public"."organization_role" AS organization_role
USING ranked
WHERE organization_role."id" = ranked."id" AND ranked.row_number > 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'customer_user_id_fkey'
      AND conrelid = '"billing"."customer"'::regclass
  ) THEN
    ALTER TABLE "billing"."customer"
      ADD CONSTRAINT "customer_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "public"."user"("id")
      ON DELETE SET NULL ON UPDATE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'customer_organization_id_fkey'
      AND conrelid = '"billing"."customer"'::regclass
  ) THEN
    ALTER TABLE "billing"."customer"
      ADD CONSTRAINT "customer_organization_id_fkey"
      FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id")
      ON DELETE SET NULL ON UPDATE CASCADE NOT VALID;
  END IF;
END $$;
