// Pure budget guard: launch failures count; retry never broadens the approved matrix.
import { SUPPORTED_AGENTS } from './agents.mjs'

export function evaluationBucket(ledger, agent, scenario, version, retry) {
  if (
    !SUPPORTED_AGENTS.includes(agent) ||
    !['REST', 'WS', 'MIXED'].includes(scenario) ||
    !['old', 'new'].includes(version)
  )
    throw new Error('Unknown evaluation scenario')
  const limit =
    agent === 'codex'
      ? version === 'new' && scenario !== 'MIXED'
        ? 2
        : 1
      : version === 'new' && scenario !== 'MIXED'
        ? 1
        : 0
  if (!limit) throw new Error('Scenario not in approved matrix')
  const bucket = retry ? ledger.retryRuns : ledger.runs
  if (bucket.length >= (retry ? 6 : 12)) throw new Error('Evaluation budget exhausted')
  if ([...ledger.runs, ...ledger.retryRuns].some(r => r.status === 'running'))
    throw new Error('Previous run unfinished; reconcile evidence before another task')
  if (
    !retry &&
    bucket.filter(r => r.agent === agent && r.scenario === scenario && r.version === version).length >= limit
  )
    throw new Error('Scenario allocation exhausted')
  return bucket
}
