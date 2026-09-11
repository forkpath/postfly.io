\set ON_ERROR_STOP on

BEGIN TRANSACTION READ ONLY;
SET LOCAL statement_timeout = '30s';
SET LOCAL lock_timeout = '1s';

\echo 'Duplicate organization memberships'
SELECT organization_id, user_id, COUNT(*) AS row_count,
       ARRAY_AGG(id ORDER BY created_at, id) AS ids,
       ARRAY_AGG(DISTINCT role) AS roles
FROM public.member
GROUP BY organization_id, user_id
HAVING COUNT(*) > 1;

\echo 'Duplicate organization roles'
SELECT organization_id, role, COUNT(*) AS row_count,
       ARRAY_AGG(id ORDER BY created_at, id) AS ids,
       ARRAY_AGG(DISTINCT permission) AS permissions
FROM public.organization_role
GROUP BY organization_id, role
HAVING COUNT(*) > 1;

\echo 'Billing references that cannot be resolved to a Better Auth user'
SELECT c.id, c.reference_id, c.provider, c.external_id
FROM billing.customer AS c
LEFT JOIN public.user AS u ON u.id = c.reference_id
WHERE u.id IS NULL
ORDER BY c.created_at, c.id;

\echo 'Better Auth account inventory by provider'
SELECT provider_id, COUNT(*) AS account_count,
       COUNT(DISTINCT user_id) AS user_count,
       COUNT(*) FILTER (WHERE account_id IS NULL OR account_id = '') AS empty_account_ids
FROM public.account
GROUP BY provider_id
ORDER BY provider_id;

\echo 'Better Auth account identifiers shared by multiple rows or users'
SELECT provider_id, account_id, COUNT(*) AS row_count,
       COUNT(DISTINCT user_id) AS user_count,
       ARRAY_AGG(DISTINCT user_id ORDER BY user_id) AS user_ids
FROM public.account
WHERE account_id IS NOT NULL AND account_id <> ''
GROUP BY provider_id, account_id
HAVING COUNT(*) > 1 OR COUNT(DISTINCT user_id) > 1
ORDER BY provider_id, account_id;

\echo 'Better Auth users with multiple account IDs for one provider (review only)'
SELECT user_id, provider_id, COUNT(*) AS row_count,
       COUNT(DISTINCT account_id) AS account_id_count,
       ARRAY_AGG(DISTINCT account_id ORDER BY account_id) AS account_ids
FROM public.account
GROUP BY user_id, provider_id
HAVING COUNT(DISTINCT account_id) > 1
ORDER BY provider_id, user_id;

\echo 'Better Auth suspicious credential/password combinations'
SELECT id, user_id, provider_id, account_id,
       CASE
         WHEN provider_id = 'credential' AND (password IS NULL OR password = '')
           THEN 'credential account without password'
         WHEN provider_id <> 'credential' AND password IS NOT NULL
           THEN 'non-credential account with password'
       END AS finding
FROM public.account
WHERE (provider_id = 'credential' AND (password IS NULL OR password = ''))
   OR (provider_id <> 'credential' AND password IS NOT NULL)
ORDER BY provider_id, user_id, id;

\echo 'Webhook processing inventory'
SELECT provider, status, COUNT(*) AS event_count,
       MIN(processed_at) AS oldest_processed_at,
       MAX(processed_at) AS newest_processed_at
FROM billing.webhook_event
GROUP BY provider, status
ORDER BY provider, status;

\echo 'Relation sizes'
SELECT schemaname, relname,
       pg_size_pretty(pg_total_relation_size(format('%I.%I', schemaname, relname))) AS total_size,
       n_live_tup
FROM pg_stat_user_tables
WHERE schemaname IN ('public', 'billing')
ORDER BY pg_total_relation_size(format('%I.%I', schemaname, relname)) DESC;

\echo 'Index sizes and usage'
SELECT schemaname, relname, indexrelname,
       pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
       idx_scan,
       last_idx_scan
FROM pg_stat_user_indexes
WHERE schemaname IN ('public', 'billing')
ORDER BY pg_relation_size(indexrelid) DESC, schemaname, relname, indexrelname;

\echo 'Long-running transactions'
SELECT pid, usename, application_name, state,
       clock_timestamp() - xact_start AS transaction_age,
       wait_event_type, wait_event
FROM pg_stat_activity
WHERE xact_start IS NOT NULL
  AND pid <> pg_backend_pid()
ORDER BY xact_start;

ROLLBACK;
