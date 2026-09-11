# Wave merge and release map

The current working tree contains a large, interdependent migration diff. Do
not stage or merge it as one change. Build the following PRs from the listed
scopes, preserving unrelated user changes and running each PR's gate before the
next one is opened.

## Merge order

| PR | Scope | Required gate | Rollback |
| --- | --- | --- | --- |
| W0 - control plane | `.env.example`, `docs/migrations/**`, read-only `scripts/migrations/preflight*.sql`, ledger template | SQL parses against a disposable database; no runtime behavior change | Revert documentation/config only |
| W1 - truthful targets and CI | `nx.json`, project target definitions, `.github/workflows/ci.yml`, Node/pnpm normalization, DB URL compatibility | Full `lint,typecheck,test,build`; affected leaf/shared probes; second deterministic run is cached | Revert CI/target configuration; keep new env alias during compatibility window |
| W2 - auth governance | `tools/auth-schema/**`, `scripts/auth/**`, auth/pg-dao schema-check targets, Better Auth pins and lockfile | schema-check zero drift; auth schema hash unchanged after Prisma generate; auth regression matrix | Restore 1.6.2 pins and prior image; no production DDL |
| W3A - auth boundaries | `libs/auth-contract`, `libs/auth-client-*`, `libs/auth-server`, auth compatibility facade and consumer imports | graph/boundary lint plus auth tests for every runtime | Revert consumers to facade |
| W3B - billing boundaries | `libs/billing-contract`, `libs/billing-client-*`, `libs/billing-server`, billing facade and consumer imports | graph/boundary lint, billing tests and all frontend builds | Revert consumers to facade |
| W3C - UI/runtime boundaries | `libs/ui-core`, `libs/ui-web`, `libs/ui-native` and direct consumer imports | web/mobile/desktop/extension typecheck and build | Revert the boundary PR |
| W3D - server platform boundaries | `libs/server-kernel`, `libs/server-nest`, `libs/server-redis`, `libs/server-rabbitmq`, Auth Nest adapter and direct service imports | engine/pulse/worker lint, typecheck, test and build; graph has no cycles; no legacy project or alias | Revert the boundary PR |
| W4A - Expand DDL | Prisma models/generated client, three expand migrations, concurrent-index script, fresh-database CI target | empty/history migration; index retry; online lock test; legacy app + Expand DB compatibility | Roll back application only; retain Expand DDL |
| W4B - dual-compatible billing application | Billing owner value object, payload/API client, engine use cases/repository/controller, `tools/migration-tests`, backfill and webhook state machine | Real PostgreSQL flags-off, dual-write, shadow-read, V2-read and organization-owned Stripe matrix; failed webhook retry and organization authorization tests | Disable flags and deploy previous digest |
| W5 - immutable release | Dockerfiles, split Compose/Kong, migrator tool, versioned migration policy/intent, release scripts and `deploy.yml` | BuildKit checks; digest-only rejection; live-ledger migration-policy check; candidate smoke; serialized rollback rehearsal | Start previous color and atomically switch Kong; retain Expand DDL |
| W6 - Pulse/Worker/E2E platform | `libs/platform-contract`, Pulse gateway, Worker inbox/consumer/health and E2E specs | Pulse auth/cross-org/drain tests; Worker duplicate/retry/DLQ tests; production Web smoke | Revert services independently; no invented business event contracts |
| W4C - Contract, later | Remove legacy field/read/write/flags from Prisma and application, then execute guarded Contract SQL | 14 stable days, two releases, all instances contract-ready, zero owner/duplicate/mismatch findings, old images non-rollbackable | Forward-fix or rehearsed backup restore only |

## Rules for constructing each PR

1. Start from `dev`; never use the current dirty tree as an all-in-one commit.
2. Move files by logical ownership, not by directory alone. A consumer import
   belongs in the same boundary PR as the public API it adopts.
3. Keep compatibility facades until every in-repository consumer and one
   released downstream version has migrated.
4. Generated Prisma files belong with the schema/migration that generated them;
   generated trailing whitespace is not hand-edited.
5. Database, release, signing, EAS and environment-mutating targets stay
   `cache: false` in every intermediate PR.
6. Record Git SHA, image digests, migration IDs, operator, gate results and the
   previous release in the ledger for every production wave.

## Release sequence after merge

`W0 -> W1 -> W2 -> W3A/B/C/D -> W4A -> W4B flags off -> dual-write -> backfill
-> shadow-read 72h -> V2 read -> organization billing -> W5/W6 operational
proof -> 14d/two releases -> W4C Contract`.

Contract must not share a release with a Kong color switch. A failure before
Contract always rolls back application images and leaves compatible Expand DDL
in place. The blue-green controller accepts only a checked-in `none` or
`expand` intent; pending bootstrap/Contract/unknown migrations fail before
Prisma, so W4C must use its separately approved execution path.
