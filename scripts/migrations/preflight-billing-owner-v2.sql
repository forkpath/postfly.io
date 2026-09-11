\set ON_ERROR_STOP on

BEGIN TRANSACTION READ ONLY;
SET LOCAL statement_timeout = '30s';
SET LOCAL lock_timeout = '1s';

\echo 'Billing Owner V2 backfill progress'
SELECT
  COUNT(*) AS total_customers,
  COUNT(*) FILTER (WHERE user_id IS NOT NULL) AS user_owned,
  COUNT(*) FILTER (WHERE organization_id IS NOT NULL) AS organization_owned,
  COUNT(*) FILTER (WHERE user_id IS NULL AND organization_id IS NULL) AS not_backfilled,
  COUNT(*) FILTER (WHERE user_id IS NOT NULL AND organization_id IS NOT NULL) AS invalid_dual_owner
FROM billing.customer;

\echo 'Webhook retry inventory'
SELECT
  provider,
  status,
  COUNT(*) AS event_count,
  MAX(attempt_count) AS maximum_attempt_count,
  MIN(last_attempt_at) FILTER (WHERE status = 'failed') AS oldest_failed_attempt
FROM billing.webhook_event
GROUP BY provider, status
ORDER BY provider, status;

ROLLBACK;
