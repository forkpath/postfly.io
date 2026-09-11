# Immutable production deployment

Ray production releases are immutable and database-compatible. Production no
longer pulls Git source or builds on the deployment host. The only supported
release path is `.github/workflows/deploy.yml` followed by the versioned release
controller in `scripts/release/deploy-blue-green.sh`.

## Source policy

- `dev` is the integration branch.
- Accepted releases are promoted to `main`.
- A production `v*` tag must point to a commit reachable from `main`; the
  release workflow rejects every other tag.
- GitHub Actions and runtime dependencies are pinned. Production commands must
  not download an unpinned CLI with `npx` or `latest`.

## Artifact flow

The release workflow performs the following operations:

1. Verify the tag belongs to `main`.
2. Install Node 24.14.1 and pnpm 10.25.0 from the frozen lockfile.
3. Run all lint, typecheck, test and deterministic build targets.
4. Validate Prisma and Better Auth schema contracts.
5. Package Engine, Pulse and Worker runtime artifacts.
6. Build Engine, Web, Pulse, Worker and Migrator OCI images tagged with the Git
   SHA.
7. Push images to GHCR and pass their immutable digests to the production job.

The deployment host receives only the versioned migration intent, Compose,
Kong, release controller and smoke-test files. It pulls images by digest; a
mutable tag is never used as the runtime identity.

## Database migration boundary

The dedicated Migrator image contains the pinned Prisma CLI, schema, migration
history and concurrent-index script. Its entrypoint runs:

1. the migration-policy checker against the live Prisma ledger;
2. `prisma migrate deploy` from the frozen workspace dependency;
3. for an `expand` release only, the retry-safe online index/data-cleanup phase
   through `psql` in autocommit mode.

Every Prisma migration is classified as `bootstrap`, `expand` or `contract` and
bound to its `migration.sql` SHA-256 in the image's versioned
`release-policy.json`. The tagged
`.release/migration-class` may only declare `none` or `expand`. `none` requires
an empty pending set and all 14 required online indexes to be valid/ready;
`expand` requires every pending migration to be Expand and repeats the index
readiness check after the online phase. Unknown ledger entries, rewritten
migration SQL, fresh-database bootstrap history and Contract all fail before
Prisma. The destructive Billing owner contract is deliberately separate at
`scripts/migrations/sql/billing-owner-v2-contract.sql` and must not run during a
blue-green traffic switch. Its production gates are documented in
`docs/migrations/billing-owner-v2-runbook.md`.

## Blue-green release sequence

Before deployment, `/opt/ray/.env` (or `DEPLOY_PATH/.env`) must provide the
infrastructure credentials, feature flags, a working `BACKUP_CHECK_COMMAND`
and `RELEASE_GUARD_COMMAND`. The workflow supplies release SHA, image digests
and smoke credentials. The controller rejects any runtime image reference that
does not end in an immutable `@sha256:<digest>`.

`RELEASE_GUARD_COMMAND` runs every 15 seconds during the post-switch window
(five minutes by default). It receives `DEPLOY_CANDIDATE_COLOR` and
`DEPLOY_RELEASE_SHA` and must exit non-zero when an agreed threshold is
exceeded: HTTP error rate, P95 latency, authentication failures, database
connections or RabbitMQ backlog.

The release controller then:

1. atomically acquires the host release lock and validates Billing rollout plus
   the tagged migration intent;
2. requires the backup check to succeed;
3. pulls all five immutable image digests;
4. computes the live pending-migration plan, then runs the Migrator against the
   shared PostgreSQL service, which independently rechecks the plan and online
   index readiness;
5. starts the inactive application color;
6. waits for Engine, Web, Pulse and Worker health checks;
7. executes authenticated auth, billing, organization and Pulse probes;
8. atomically updates Kong to the candidate color;
9. runs the external metric guard throughout the observation window and
   automatically switches back on failure;
10. asks old Pulse sockets to reconnect, stops the old color after drain and
   writes a release manifest under `releases/manifests/<git-sha>.json`.

The manifest records the operator, current and previous release SHA, all five
image digests, declared migration class, preflight pending plan, applied Prisma
migration IDs and the result of each release gate. Per-color release pointers
make a later rollback auditable. GitHub's production concurrency group and the
host lock serialize deploy, rollback and finalize operations.

The stopped previous containers remain restartable for rollback. Contract
migration is never scheduled in the same release.

The controller has no unsafe first-deploy default. Before the first blue-green
release, complete `docs/migrations/blue-green-adoption-runbook.md`; otherwise a
missing/invalid active color, release pointer or healthy rollback stack causes
deployment to fail before backup, migration or traffic changes.

## Rollback and finalization

Application rollback keeps compatible expand DDL in place and switches Kong to
the previous color:

```bash
DEPLOY_PATH=/opt/ray \
RELEASE_OPERATOR='<on-call-identity>' \
ROLLBACK_REASON='<incident-or-change-reference>' \
  ./scripts/deploy.sh rollback
```

Rollback starts and health-checks the previous color before switching Kong,
then stops the failed color. It writes a `rollback-*.json` event with both
release SHAs, reason, operator, elapsed seconds and the default five-minute RTO
result. Traffic remains restored if the RTO is missed, but the command fails so
the missed operational objective cannot be reported as a pass.

After the observation and application rollback window closes, stop the inactive
color with:

```bash
DEPLOY_PATH=/opt/ray ./scripts/deploy.sh finalize
```

Do not reverse production DDL during an incident. After Contract, use a forward
fix or the rehearsed backup restore procedure.

## Local development

Local infrastructure and development servers remain separate from production
deployment:

```bash
pnpm docker:dev
pnpm dev:web
pnpm dev:engine
```

The retired host-build commands (`update`, `build`, `restart`, `migrate`, and
related legacy Compose operations) now fail closed in `scripts/deploy.sh`.
