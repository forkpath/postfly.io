# Initial blue-green adoption runbook

## Confirmed production state

On 2026-08-09 the repository owner confirmed that the production application
has not been deployed. Therefore the legacy-to-green sequence below is not the
applicable first-deployment procedure today; it remains available only if a
legacy deployment is later discovered and evidenced.

Do not point the normal controller at an empty database. Its fail-closed
migration policy intentionally rejects pending bootstrap history, and its
release controller requires a real previous application color. The first green
deployment needs a separate, manually approved greenfield bootstrap procedure
that proves the target database is empty, applies the full immutable migration
history before public traffic, validates all online indexes, starts and tests
green, and records that no previous application rollback target exists. The
five-minute application rollback RTO can be rehearsed only on the following
blue release.

The normal release controller is deliberately not a bootstrap tool. It refuses
to deploy unless an active color, its release pointer and four healthy
application containers already exist. This prevents the first immutable
release from running a database migration without a verified application
rollback target.

Do not create placeholder state files to bypass this guard.

## Required discovery

Before scheduling adoption, record all of the following in a release ledger:

- currently deployed Git SHA and reproducible Engine/Web/Pulse/Worker image
  digests;
- current Kong upstream names, public routes and rollback command;
- current PostgreSQL migration IDs and successful Expand compatibility check;
- backup identifier and isolated restore rehearsal;
- current WebSocket connections and Worker queue backlog;
- operator, approver, observation guard and rollback decision owner.

The repository does not currently contain authoritative evidence describing
the live legacy topology. Stop if any item is unknown; do not infer it from the
retired Compose file or local Docker state.

## Adoption sequence

1. Build the currently accepted application SHA into the five immutable
   images. Do not introduce Contract DDL or feature-flag changes. Confirm every
   Prisma migration is classified in `release-policy.json` and the tagged
   `.release/migration-class` is `expand`; initial database bootstrap is a
   separate provisioned-environment procedure and is rejected here.
2. Start that known-good application as `green` with
   `docker/docker-compose.app.yml`, sharing the existing infrastructure.
3. Verify all four health checks, authenticated auth/billing/organization
   smoke, Pulse authentication and Worker readiness directly against green.
4. Confirm the legacy upstream is still healthy and can be restored atomically.
5. Switch Kong to green and run the production metric guard for at least the
   normal observation window. Preserve the legacy stack throughout the window.
6. If any gate fails, restore the legacy Kong upstream. Do not run reverse DDL.
7. Only after every check passes, record the adopted release:

   ```bash
   install -d /opt/ray/releases/manifests
   printf '%s\n' green > /opt/ray/releases/active-color
   printf '%s\n' '<adopted-git-sha>' > /opt/ray/releases/color-green-release
   ```

8. Attach image digests, migration IDs, smoke evidence, observation results and
   the measured adoption rollback time to the ledger.

After this one-time adoption, ordinary releases can start blue, retain green as
the rollback target and use the automated controller. The first ordinary blue
release remains an Expand-compatible release; Contract is forbidden.

The controller creates `releases/controller.lock` atomically and removes it on
normal exit. If the host was killed and a stale lock remains, inspect its `pid`,
the deployment process list, active GitHub production workflow and current Kong
upstream before removing the `pid` file and empty lock directory. Never delete
the lock merely to make a queued release proceed.

## Exit gate

Adoption is complete only when `active-color` is valid, the matching
`color-<color>-release` pointer exists, all four active containers are healthy,
and the legacy-to-green rollback rehearsal has evidence. A successful local
controller test is not production adoption evidence.
