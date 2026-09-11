# SaaS platform migration control plane

This directory is the operational record for the staged Nx, Better Auth and
PostgreSQL migration. Production changes follow `expand -> backfill -> switch ->
contract`; an incident rolls the application image back and leaves compatible
expand changes in place.

## Required evidence for every release

- source Git SHA and immutable image digests;
- migration identifiers and whether they are expand or contract;
- database backup/restore rehearsal reference;
- preflight, smoke test and post-deploy verification results;
- previous known-good release manifest;
- rollout flags and rollback decision owner.

Copy `release-ledger-template.md` for each production release. Contract
migrations require two successful V2 production releases, 14 stable days, no
legacy instances and zero unresolved preflight findings.

Use `implementation-audit.md` as the evidence/status source and
`wave-merge-map.md` to split the current migration work into independently
reviewable and reversible PRs. Repository implementation must not be promoted
to `complete` while that audit still contains external gates.

CI validation writes machine-readable Nx duration and cache evidence. See
`ci-performance-gates.md`; never construct the Wave 0 baseline from failed
workflow runs. Generate a candidate only through the manual
`Capture Nx CI baseline` workflow, then record and approve its summary artifact
before setting `CI_BASELINE_MEDIAN_MS`.

Before the first immutable blue-green release, follow
`blue-green-adoption-runbook.md`. The normal controller intentionally refuses
to invent an active color or rollback release.

## Safe commands

Run the database preflight with a read-only role:

```bash
psql "$POSTGRES_DATABASE_URL" --set ON_ERROR_STOP=1 \
  --file scripts/migrations/preflight.sql
```

Capture the current Nx topology without changing the workspace:

```bash
pnpm exec nx graph --print > /tmp/ray-project-graph.json
pnpm exec nx show projects --json
```

Never run `prisma db push`, `migrate reset`, EAS, signing or deployment targets
from CI validation jobs.

Disposable PostgreSQL 17 CI validates both migration histories:

```bash
pnpm nx run pg-dao:migration-test --skipNxCache
pnpm nx run pg-dao:historical-migration-test --skipNxCache
```

The historical path baselines the five pre-Expand migrations, seeds legacy
rows, proves conflicting membership/permission data fails without cleanup,
then proves an operator-resolved retry, old-application writes, quarantine and
interrupted Billing owner backfill. It also invokes the tagged
`migration-tests` application in five fresh processes to verify flags-off,
dual-write, shadow-read, V2-read and organization Billing against the real
Expand schema. Both targets require an empty disposable database and are
intentionally non-cacheable.

For an already-expanded disposable database, the application compatibility
matrix can also be run directly:

```bash
pnpm nx run migration-tests:billing-application-compatibility --skipNxCache
```

The release controller enforces the same rollout ordering before it runs any
backup, migration or Docker command: dual-write, then shadow-read, then V2-read,
then organization Billing. Every flag must be exactly `true` or `false`.

## Immutable migration classification

Every directory under `libs/pg-dao/src/migrations` must have exactly one entry
in `release-policy.json`: `bootstrap`, `expand` or `contract`, plus the exact
SHA-256 of its `migration.sql`. CI fails for a missing/stale entry, unsupported
class or content rewrite. The immutable tag also contains
`.release/migration-class`, whose only valid values for the normal blue-green
controller are:

- `expand`: pending migrations must all be classified `expand`;
- `none`: no migration may be pending, every policy-required online index must
  exist and be valid/ready, and the online index/data-cleanup phase is skipped.

The migrator queries the target database's successful Prisma ledger before it
runs Prisma. Unknown database migrations, an uninitialized database containing
pending bootstrap history, pending Contract migrations, changed SQL and
declaration drift all stop before DDL. The controller repeats this preflight from the pinned
image, records the resulting pending plan in the release manifest, and the
migrator repeats it immediately before `prisma migrate deploy`. An Expand run
performs a final `none`-equivalent read-only check after its concurrent-index
phase, so it cannot report success with a missing or invalid index.

Do not classify Contract as Expand or change the release intent to bypass this
gate. Contract uses the separately approved Billing runbook after its 14-day,
two-release and no-rollback gates; the normal blue-green path cannot execute it.
GitHub serializes production workflows, and the host controller also holds
`releases/controller.lock` across deploy, rollback and finalize. A stale lock
may be removed only after an operator proves no controller process is active
and records the recovery in the release ledger.

## Better Auth version governance

The runtime packages (`better-auth`, Expo and Passkey) are pinned together at
`1.6.26`. The separately published `@better-auth/cli` has an independent
version line and its stable npm `latest` is pinned at `1.4.21`; there is no
numeric `1.6.26` CLI release. Compatibility is therefore enforced by the
generated logical-contract comparison in `auth:schema-check`, not by pretending
the two independent package versions are numerically equal. Renovation of
either pin must pass that check and produce no unintended Prisma migration.

## Critical-path E2E

`web-e2e` always verifies that the production Web build renders. The full SaaS
matrix is enabled only in an isolated seeded environment, using:

- `E2E_API_BASE_URL`;
- `E2E_OWNER_EMAIL` and `E2E_OWNER_PASSWORD`;
- `E2E_MEMBER_EMAIL`, `E2E_MEMBER_PASSWORD` and `E2E_ORGANIZATION_ID`;
- optional `E2E_INVITEE_EMAIL` with `E2E_EMAIL_MOCK_ENABLED=true`;
- optional `E2E_STRIPE_VARIANT_ID` with
  `E2E_PROVIDER_MOCK_ENABLED=true`.

Run it with `pnpm nx e2e web-e2e`. The regular and Nx-atomized Playwright
targets explicitly disable Nx Cache because these flows mutate isolated auth
and organization data. Provider and email mutations are deliberately disabled
unless their mock flags are explicit. Pulse authorization and Worker
retry/idempotency/DLQ behavior are covered by their service test targets; the
release pipeline repeats authenticated auth, billing, organization and Pulse
smoke probes against the candidate color before traffic is switched.
