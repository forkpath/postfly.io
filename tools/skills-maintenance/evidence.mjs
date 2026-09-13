// 验证人工行为评测证据与候选内容绑定；不调用模型或代写通过结果。
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { SUPPORTED_AGENTS } from './agents.mjs'

export function verifyEvidence(evidence, expectedDigest) {
  if (!/^[a-f0-9]{64}$/.test(expectedDigest) || evidence.candidateDigest !== expectedDigest)
    throw new Error('Candidate changed: behavior evidence is stale')
  if (!/^[a-f0-9]{40}$/.test(evidence.baseline ?? '')) throw new Error('Confirmed baseline SHA required')
  if (!Array.isArray(evidence.runs) || evidence.runs.length > 18) throw new Error('Invalid evaluation budget')
  const required = SUPPORTED_AGENTS.flatMap(agent => ['REST', 'WS'].map(scenario => agent + ':' + scenario))
  for (const pair of required) {
    const [agent, scenario] = pair.split(':')
    const matches = evidence.runs.filter(
      r =>
        r.agent === agent &&
        r.scenario === scenario &&
        r.version === 'new' &&
        r.baseline === evidence.baseline &&
        r.candidateDigest === expectedDigest
    )
    if (
      !matches.some(
        r =>
          r.status === 'passed' &&
          r.agentExecutedTests === true &&
          r.independentVerificationPassed === true &&
          /^[a-f0-9]{64}$/.test(r.logDigest ?? '') &&
          /^[a-f0-9]{64}$/.test(r.verificationDigest ?? '') &&
          r.cliVersion &&
          r.model
      )
    )
      throw new Error('Missing real generated/tested evidence: ' + pair)
  }
  return { passed: true, candidateDigest: expectedDigest }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    console.log(
      JSON.stringify(verifyEvidence(JSON.parse(readFileSync(process.argv[2], 'utf8')), process.argv[3]), null, 2)
    )
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
