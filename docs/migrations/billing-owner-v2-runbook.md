# Billing Owner V2 Runbook

This runbook enforces `Expand -> Backfill -> Switch -> Contract`. Production
incidents before Contract are handled by rolling the application image back;
expand DDL is retained.

## Expand

1. Run the pinned migrator image. It first applies Prisma migrations, then runs
   `expand-concurrent-indexes.sql` through `psql` in autocommit mode. Never move
   the concurrent index statements back into a Prisma migration transaction.
2. Deploy the application with all four billing flags disabled.
3. Enable `BILLING_OWNER_V2_DUAL_WRITE` and verify new customers contain both
   `reference_id` and exactly one explicit owner column.

## Backfill

Dry-run first:

```bash
pnpm nx run pg-dao:backfill-billing-owner -- --batch-size=500
```

Apply only after the dry-run has no quarantine rows:

```bash
pnpm nx run pg-dao:backfill-billing-owner -- --apply --batch-size=500
```

The script commits one batch at a time and prints its cursor. Pass
`--cursor=<id>` to resume. Any unknown owner or `(owner, provider)` collision
stops the run and writes a JSONL quarantine report.

## Switch

1. Enable `BILLING_OWNER_V2_SHADOW_READ`.
2. Require zero mismatch logs for 72 continuous hours.
3. Enable `BILLING_OWNER_V2_READ`.
4. Enable `ORGANIZATION_BILLING_ENABLED`; organization checkout remains
   Stripe-only and RevenueCat remains user-owned.

## Contract

Do not execute `scripts/migrations/sql/billing-owner-v2-contract.sql` until all
of these are recorded in the release ledger:

- V2 read stable for at least 14 days;
- two successful production releases;
- every instance runs V2 code;
- owner nulls, quarantines, duplicate roles/memberships, and shadow mismatches
  are all zero;
- old images are marked non-rollbackable.

After Contract, use a forward fix or the rehearsed backup restore. Never apply
ad-hoc reverse DDL.

Contract is a later, independent PR and release. Before running its SQL, that
PR must remove `referenceId` from the Prisma `Customer` model and generated
client, remove every legacy read/write branch and delete the four temporary
feature flags. Deploy and verify that contract-ready application against the
still-expanded database first. The current dual-compatible application is not
compatible with a database where `reference_id` has already been dropped.

The destructive SQL fails closed unless the explicit confirmation is supplied:

```bash
psql "$POSTGRES_DATABASE_URL" --set ON_ERROR_STOP=1 \
  --set confirm_billing_owner_v2_contract=true \
  --file scripts/migrations/sql/billing-owner-v2-contract.sql
```

That confirmation is not a substitute for the 14-day, two-release, zero-drift
and no-rollback gates above; it only prevents an accidental direct invocation.
