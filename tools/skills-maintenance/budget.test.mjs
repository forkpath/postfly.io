import assert from 'node:assert/strict'
import { test } from 'node:test'

import { evaluationBucket } from './budget.mjs'

test('evaluation budget counts failed launches and refuses unapproved retries', () => {
  assert.throws(() => evaluationBucket({ runs: [], retryRuns: [] }, 'claude', 'REST', 'new', true), /Unknown/)
  const failed = { agent: 'cursor', scenario: 'REST', version: 'new', status: 'agent-failed' }
  const ledger = { runs: [failed], retryRuns: [] }
  assert.throws(() => evaluationBucket(ledger, 'cursor', 'REST', 'new', false), /allocation/)
  assert.equal(evaluationBucket(ledger, 'cursor', 'REST', 'new', true), ledger.retryRuns)
  assert.throws(() => evaluationBucket(ledger, 'cursor', 'REST', 'old', true), /matrix/)
  assert.throws(
    () => evaluationBucket({ runs: Array(12).fill(failed), retryRuns: [] }, 'codex', 'WS', 'new', false),
    /budget/
  )
  assert.throws(
    () => evaluationBucket({ runs: [], retryRuns: Array(6).fill(failed) }, 'codex', 'WS', 'new', true),
    /budget/
  )
  assert.throws(
    () => evaluationBucket({ runs: [{ ...failed, status: 'running' }], retryRuns: [] }, 'codex', 'WS', 'new', false),
    /unfinished/
  )
})
