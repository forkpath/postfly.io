import assert from 'node:assert/strict'
import { test } from 'node:test'

import { verifyEvidence } from './evidence.mjs'

test('manual behavior evidence invalidates on content change or absent real Agent tests', () => {
  const digest = 'a'.repeat(64),
    baseline = 'b'.repeat(40)
  const runs = ['codex', 'cursor'].flatMap(agent =>
    ['REST', 'WS'].map(scenario => ({
      agent,
      scenario,
      version: 'new',
      baseline,
      candidateDigest: digest,
      status: 'passed',
      agentExecutedTests: true,
      independentVerificationPassed: true,
      logDigest: 'c'.repeat(64),
      verificationDigest: 'd'.repeat(64),
      cliVersion: 'fixture',
      model: 'fixture'
    }))
  )
  const evidence = { candidateDigest: digest, baseline, runs }
  assert.equal(verifyEvidence(evidence, digest).passed, true)
  assert.equal(runs.length, 4)
  assert.throws(
    () => verifyEvidence({ ...evidence, runs: runs.map(r => ({ ...r, agent: 'claude' })) }, digest),
    /codex/
  )
  assert.throws(() => verifyEvidence(evidence, 'e'.repeat(64)), /stale/)
  assert.throws(() => verifyEvidence({ ...evidence, runs: runs.filter(r => r.agent !== 'cursor') }, digest), /cursor/)
  assert.throws(
    () => verifyEvidence({ ...evidence, runs: runs.map(r => ({ ...r, agentExecutedTests: false })) }, digest),
    /Missing/
  )
  assert.throws(
    () =>
      verifyEvidence({ ...evidence, runs: runs.map(r => ({ ...r, independentVerificationPassed: false })) }, digest),
    /Missing/
  )
})
