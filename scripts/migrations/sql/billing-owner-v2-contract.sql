-- DO NOT add this file to Prisma migrations until the 14-day rollback window,
-- two successful releases, and the release-manifest gates are all satisfied.
\set ON_ERROR_STOP on
\if :{?confirm_billing_owner_v2_contract}
\else
  DO $$
  BEGIN
    RAISE EXCEPTION 'Refusing Contract: pass --set confirm_billing_owner_v2_contract=true only after every runbook gate is recorded.';
  END $$;
\endif
\if :confirm_billing_owner_v2_contract
\else
  DO $$
  BEGIN
    RAISE EXCEPTION 'Refusing Contract: confirm_billing_owner_v2_contract must be true.';
  END $$;
\endif

SET lock_timeout = '5s';
SET statement_timeout = '15min';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "billing"."customer"
    WHERE ("user_id" IS NULL) = ("organization_id" IS NULL)
  ) THEN
    RAISE EXCEPTION 'billing owner contract gate failed: owner must be exactly one of user or organization';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "public"."member"
    GROUP BY "organization_id", "user_id"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'billing owner contract gate failed: duplicate membership remains';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "public"."organization_role"
    GROUP BY "organization_id", "role"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'billing owner contract gate failed: duplicate organization role remains';
  END IF;
END $$;

ALTER TABLE "billing"."customer"
  VALIDATE CONSTRAINT "customer_user_id_fkey";
ALTER TABLE "billing"."customer"
  VALIDATE CONSTRAINT "customer_organization_id_fkey";

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'customer_exactly_one_owner_check'
      AND conrelid = '"billing"."customer"'::regclass
  ) THEN
    ALTER TABLE "billing"."customer"
      ADD CONSTRAINT "customer_exactly_one_owner_check"
      CHECK (("user_id" IS NOT NULL)::integer + ("organization_id" IS NOT NULL)::integer = 1)
      NOT VALID;
  END IF;
END $$;
ALTER TABLE "billing"."customer"
  VALIDATE CONSTRAINT "customer_exactly_one_owner_check";

DROP INDEX CONCURRENTLY IF EXISTS "billing"."customer_reference_id_provider_key";

-- This short-lock DDL is the irreversible boundary for old applications.
ALTER TABLE "billing"."customer" DROP COLUMN IF EXISTS "reference_id";
