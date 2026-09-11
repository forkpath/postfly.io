\set ON_ERROR_STOP on

SET lock_timeout = '3s';
SET statement_timeout = '15min';

-- This file must be executed by psql with autocommit enabled. Never wrap it in
-- BEGIN/COMMIT: PostgreSQL forbids CREATE INDEX CONCURRENTLY in a transaction.
-- A failed concurrent build leaves an invalid index behind. Remove only the
-- invalid indexes owned by this migration before retrying; IF NOT EXISTS would
-- otherwise silently accept the unusable index.
SELECT format(
  'DROP INDEX CONCURRENTLY IF EXISTS %I.%I;',
  index_namespace.nspname,
  index_relation.relname
)
FROM pg_index AS index_definition
JOIN pg_class AS index_relation
  ON index_relation.oid = index_definition.indexrelid
JOIN pg_namespace AS index_namespace
  ON index_namespace.oid = index_relation.relnamespace
WHERE NOT index_definition.indisvalid
  AND (index_namespace.nspname, index_relation.relname) IN (
    ('public', 'member_organization_user_unique'),
    ('public', 'organization_role_organization_role_unique'),
    ('billing', 'customer_user_provider_unique'),
    ('billing', 'customer_organization_provider_unique'),
    ('billing', 'customer_user_provider_idx'),
    ('billing', 'customer_organization_provider_idx'),
    ('billing', 'subscription_customer_status_created_idx'),
    ('billing', 'order_customer_status_created_idx'),
    ('public', 'invitation_organization_status_idx'),
    ('public', 'invitation_email_status_idx'),
    ('billing', 'webhook_event_status_attempt_idx'),
    ('billing', 'webhook_event_received_at_idx'),
    ('public', 'worker_inbox_consumer_message_unique'),
    ('public', 'worker_inbox_status_lease_idx')
  )
\gexec

-- The Prisma migration and this online-index phase are separate. Re-run the
-- conflict guard and deterministic cleanup so a failed index phase is safely
-- retryable even if duplicate rows appeared after the migration was recorded.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "public"."member"
    GROUP BY "organization_id", "user_id"
    HAVING COUNT(DISTINCT "role") > 1
  ) THEN
    RAISE EXCEPTION 'conflicting duplicate member roles detected; aborting index migration';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "public"."organization_role"
    GROUP BY "organization_id", "role"
    HAVING COUNT(DISTINCT "permission") > 1
  ) THEN
    RAISE EXCEPTION 'conflicting duplicate organization role permissions detected; aborting index migration';
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

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "member_organization_user_unique"
  ON "public"."member" ("organization_id", "user_id");
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "organization_role_organization_role_unique"
  ON "public"."organization_role" ("organization_id", "role");

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "customer_user_provider_unique"
  ON "billing"."customer" ("user_id", "provider")
  WHERE "user_id" IS NOT NULL;
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "customer_organization_provider_unique"
  ON "billing"."customer" ("organization_id", "provider")
  WHERE "organization_id" IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS "customer_user_provider_idx"
  ON "billing"."customer" ("user_id", "provider");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "customer_organization_provider_idx"
  ON "billing"."customer" ("organization_id", "provider");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "subscription_customer_status_created_idx"
  ON "billing"."subscription" ("customer_id", "status", "created_at");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "order_customer_status_created_idx"
  ON "billing"."order" ("customer_id", "status", "created_at");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "invitation_organization_status_idx"
  ON "public"."invitation" ("organization_id", "status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "invitation_email_status_idx"
  ON "public"."invitation" ("email", "status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "webhook_event_status_attempt_idx"
  ON "billing"."webhook_event" ("status", "last_attempt_at");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "webhook_event_received_at_idx"
  ON "billing"."webhook_event" ("received_at");

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "worker_inbox_consumer_message_unique"
  ON "public"."worker_inbox" ("consumer", "message_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "worker_inbox_status_lease_idx"
  ON "public"."worker_inbox" ("status", "lease_until");
