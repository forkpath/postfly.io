import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const severities = ['info', 'low', 'moderate', 'high', 'critical']
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')

// A local patch never changes the registry's finding. Keep the raw report and
// independently verify the narrowly reviewed mitigation against this checkout.
export function evaluateAudit(report, policy, { now = new Date(), read = readFileSync } = {}) {
  const counts = report?.metadata?.vulnerabilities
  if (
    !isObject(report) ||
    report.error ||
    !isObject(report.advisories) ||
    !isObject(counts) ||
    severities.some(level => !Number.isSafeInteger(counts[level]) || counts[level] < 0) ||
    !Array.isArray(report.muted) ||
    report.muted.length !== 0 ||
    policy?.version !== 1 ||
    !Array.isArray(policy.mitigations) ||
    !Number.isFinite(now.getTime())
  )
    throw new Error('Invalid audit report or mitigation policy; refusing a clean result')

  const mitigated = []
  const unresolved = []
  const represented = { high: new Set(), critical: new Set() }
  for (const advisory of Object.values(report.advisories)) {
    if (!isObject(advisory) || !severities.includes(advisory.severity)) throw new Error('Invalid advisory')
    if (!['high', 'critical'].includes(advisory.severity)) continue
    if (!Array.isArray(advisory.findings) || advisory.findings.length === 0)
      throw new Error('Missing advisory findings')
    for (const finding of advisory.findings) {
      if (
        typeof advisory.github_advisory_id !== 'string' ||
        typeof advisory.module_name !== 'string' ||
        typeof finding.version !== 'string' ||
        !Array.isArray(finding.paths) ||
        finding.paths.length === 0 ||
        finding.paths.some(path => typeof path !== 'string')
      )
        throw new Error('Invalid advisory finding')
      represented[advisory.severity].add(`${advisory.module_name}@${finding.version}`)
      const result = {
        advisory: advisory.github_advisory_id,
        package: advisory.module_name,
        version: finding.version,
        severity: advisory.severity,
        paths: finding.paths
      }
      const matches = policy.mitigations.filter(
        entry =>
          entry.advisory === result.advisory &&
          entry.package === result.package &&
          entry.version === result.version &&
          entry.severity === result.severity &&
          entry.advisoryUpdated === advisory.updated &&
          entry.vulnerableVersions === advisory.vulnerable_versions &&
          entry.patchedVersions === advisory.patched_versions &&
          JSON.stringify([...entry.paths].sort()) === JSON.stringify([...finding.paths].sort())
      )
      let reason = 'No exact reviewed local patch'
      if (matches.length === 1) {
        const entry = matches[0]
        const reviewed = Date.parse(entry.reviewedAt)
        const expiry = Date.parse(entry.expiresAt)
        if (
          !Number.isFinite(reviewed) ||
          !Number.isFinite(expiry) ||
          now < reviewed ||
          now >= expiry ||
          expiry - reviewed > 14 * 86400000
        ) {
          reason = 'Mitigation expired or has an invalid review period'
        } else if (
          !isObject(entry.files) ||
          ![
            'pnpm-lock.yaml',
            'pnpm-workspace.yaml',
            'patches/node-forge@1.4.0.patch',
            'scripts/ci/node-forge-patch.test.mjs'
          ].every(file => /^[a-f0-9]{64}$/.test(entry.files[file] ?? ''))
        ) {
          reason = 'Missing patch, frozen dependency inputs, or regression-test binding'
        } else {
          try {
            const changed = Object.entries(entry.files).find(([file, hash]) => sha256(read(file)) !== hash)
            if (changed) reason = `Reviewed file changed: ${changed[0]}`
            else {
              mitigated.push({ ...result, expiresAt: entry.expiresAt })
              continue
            }
          } catch {
            reason = 'A reviewed mitigation file cannot be read'
          }
        }
      }
      unresolved.push({ ...result, reason })
    }
  }
  // A report that omits or aggregates additional vulnerable packages cannot
  // inherit this one-package mitigation. Schema/registry drift fails closed.
  for (const level of ['high', 'critical']) {
    if (counts[level] !== represented[level].size)
      throw new Error(`Unaccounted ${level} vulnerabilities in registry report`)
  }
  return {
    passed: unresolved.length === 0,
    rawVulnerabilities: counts,
    mitigated,
    unresolved,
    evaluatedAt: now.toISOString()
  }
}

export function runAudit(output = 'dependency-audit.json') {
  const scan = spawnSync('pnpm', ['audit', '--registry=https://registry.npmjs.org', '--audit-level=high', '--json'], {
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
    timeout: 180000
  })
  writeFileSync(output, scan.stdout ?? '')
  const evaluationPath = output.replace(/\.json$/, '') + '-evaluation.json'
  let evaluation
  try {
    if (scan.error || ![0, 1].includes(scan.status)) throw new Error('Registry audit did not complete successfully')
    const report = JSON.parse(scan.stdout)
    const policy = JSON.parse(readFileSync('.github/security-mitigations.json', 'utf8'))
    evaluation = evaluateAudit(report, policy)
    if (scan.status === 1 && report.metadata.vulnerabilities.high + report.metadata.vulnerabilities.critical === 0) {
      throw new Error('Audit failed without a reported high/critical finding')
    }
  } catch (error) {
    evaluation = { passed: false, error: error.message }
  }
  writeFileSync(evaluationPath, JSON.stringify(evaluation, null, 2) + '\n')
  console.log(JSON.stringify(evaluation, null, 2))
  return evaluation.passed ? 0 : 1
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exitCode = runAudit(process.argv[2])
}
