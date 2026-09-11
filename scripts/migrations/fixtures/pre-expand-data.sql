\set ON_ERROR_STOP on

BEGIN;

INSERT INTO public."user" (
  id, name, email, email_verified, created_at, updated_at
) VALUES
  ('history-user-a', 'History User A', 'history-a@example.test', true, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  ('history-user-b', 'History User B', 'history-b@example.test', true, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z');

INSERT INTO public.organization (id, name, slug, created_at)
VALUES ('history-org', 'History Organization', 'history-organization', '2026-01-01T00:00:00Z');

-- Equal duplicates are intentionally present: Expand may keep the oldest row.
INSERT INTO public.member (id, organization_id, user_id, role, created_at) VALUES
  ('history-member-old', 'history-org', 'history-user-a', 'owner', '2026-01-01T00:00:00Z'),
  ('history-member-new', 'history-org', 'history-user-a', 'owner', '2026-01-02T00:00:00Z'),
  ('history-member-conflict', 'history-org', 'history-user-a', 'admin', '2026-01-03T00:00:00Z');

INSERT INTO public.organization_role (
  id, organization_id, role, permission, created_at, updated_at
) VALUES
  ('history-role-old', 'history-org', 'billing-admin', '{"billing":["read","write"]}', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  ('history-role-new', 'history-org', 'billing-admin', '{"billing":["read","write"]}', '2026-01-02T00:00:00Z', '2026-01-02T00:00:00Z'),
  ('history-role-conflict', 'history-org', 'billing-admin', '{"billing":["read"]}', '2026-01-03T00:00:00Z', '2026-01-03T00:00:00Z');

INSERT INTO billing.customer (
  id, reference_id, provider, external_id, created_at, updated_at
) VALUES
  ('history-customer-revenuecat', 'history-user-b', 'revenuecat', 'revenuecat-history-user-b', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  ('history-customer-stripe', 'history-user-a', 'stripe', 'stripe-history-user-a', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z');

INSERT INTO billing.subscription (
  id, customer_id, external_id, variant_id, status, store,
  period_starts_at, period_ends_at, created_at, updated_at
) VALUES (
  'history-subscription', 'history-customer-stripe', 'stripe-subscription-history',
  'price-history', 'active', 'stripe', '2026-01-01T00:00:00Z',
  '2026-02-01T00:00:00Z', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'
);

INSERT INTO billing."order" (
  id, customer_id, external_id, variant_id, status, store, created_at, updated_at
) VALUES (
  'history-order', 'history-customer-stripe', 'stripe-order-history',
  'price-history', 'succeeded', 'stripe', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'
);

INSERT INTO billing.webhook_event (
  id, event_id, provider, type, status, error, processed_at
) VALUES
  ('history-webhook-processed', 'evt-history-processed', 'stripe', 'checkout.completed', 'processed', NULL, '2026-01-01T00:00:00Z'),
  ('history-webhook-failed', 'evt-history-failed', 'stripe', 'invoice.failed', 'failed', 'provider timeout', '2026-01-01T00:01:00Z');

COMMIT;
