# CI performance evidence and gates

Wave 1 performance claims are based on machine-readable Nx task records, not
terminal screenshots. The CI wrapper reads `.nx/cache/run.json` immediately
after the validation command and stores a redacted report containing:

- workflow/run/SHA identity;
- total validation duration and exit status;
- project, target, duration and cache status for each Nx task;
- overall and remote cache hit rates for `lint`, `typecheck`, `test`, `build`.

It does not serialize environment variables, tokens, command arguments,
command output or source artifacts. Reports are retained as `nx-ci-metrics-*`
GitHub artifacts for 30 days.

Before Nx validation starts, `pnpm ci:nx-cache-contracts` checks the cache
configuration itself. It discovers public build variables from source and
requires every `VITE_*` and `EXPO_PUBLIC_*` value to participate in the
appropriate build hash. It also requires Node version, operating system and
CPU architecture runtime inputs, explicit cache exclusion for database/EAS/
signing side effects, and a bounded output contract for Prisma generation.
Adding a new public build variable without updating the named input therefore
fails CI instead of reusing a stale artifact.

Fork pull requests set `NX_NO_CLOUD=true` and skip the Nx Cloud-only
self-healing step, so untrusted forks use local cache only and receive no remote
cache credential. Internal branches and pull requests may use Nx Replay; the
official Replay behavior falls back to local cache or normal execution if the
remote cache is offline. A failed SHA-resolution step still selects the
workflow's full `run-many --all` validation path.

## Baseline boundary

As of the 2026-08-08 audit, the 50 most recent historical `CI` workflow runs in
GitHub all failed. Their wall-clock durations mostly represent early install or
configuration failure, so none is valid evidence for a successful pre-migration
CI median. Do not derive `CI_BASELINE_MEDIAN_MS` from those failed runs.

The baseline therefore remains an explicit external decision. The manual
`Capture Nx CI baseline` workflow produces a candidate from five independent
`ubuntu-latest` jobs at one Git SHA. Every sample runs the full
`lint,typecheck,test,build --all` matrix with both Nx Cloud and Nx Cache
disabled. Its aggregator fails closed if a sample failed, contains any cache
hit, comes from another SHA/workflow attempt, or reuses a sample identity.

Download the resulting `nx-ci-baseline-summary-*` artifact, record its Git SHA,
workflow run and median in the migration ledger, then configure the repository
variable `CI_BASELINE_MEDIAN_MS` with the artifact's proposed value. Do not set
the variable from a partial matrix, a local workstation measurement or a
failed workflow. A manual `CI` workflow run may still supply
`ci_baseline_median_ms` while evaluating a candidate before the repository
variable is approved.

## Automated 14-day audit

After the baseline is configured, the daily workflow downloads the preceding
14 days of metrics and fails unless all conditions hold:

- at least 10 successful validation samples;
- median duration is at least 40% below the recorded baseline;
- deterministic task cache-hit rate is at least 70%;
- a repeated Git SHA has a later run where every deterministic task is a remote
  cache hit.

The audit result is uploaded as `nx-ci-metrics-evaluation-*`. Missing samples,
missing repeated-SHA proof, inadequate improvement or insufficient cache hits
are failures, not zero-valued successes.

For an offline audit after downloading the artifacts:

```bash
pnpm ci:metrics:evaluate \
  --metrics-dir=artifacts/ci-metrics-history \
  --phase=validation \
  --baseline-median-ms=<wave-0-median> \
  --minimum-samples=10
```
