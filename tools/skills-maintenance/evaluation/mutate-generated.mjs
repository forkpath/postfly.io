// Only mutate a fresh copy of an already-generated evaluation specimen.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { sha256 } from '../core.mjs'

const source = resolve(process.argv[2] ?? '')
const scenario = process.argv[3] ?? 'REST'
assert.ok(['REST', 'WS'].includes(scenario), 'REST or WS required')
assert.ok(existsSync(join(source, 'EVALUATION-ISOLATION.json')), 'Isolated generated specimen required')
const mutations =
  scenario === 'WS'
    ? [
        {
          name: 'remove-ws-authorization',
          file: 'application/notification.ts',
          before: 'OrganizationAccess.require(await this.authorization.role(principal.userId, organizationId), write)',
          after: 'void write',
          expected: 'WS denies cross-organization subscription'
        },
        {
          name: 'remove-ws-delivery-revalidation',
          file: 'presentation/socket-server.ts',
          before: 'await this.handler.authorize(state.cookie, organizationId)',
          after: 'void organizationId',
          expected: 'WS membership revocation stops later broadcast'
        }
      ]
    : [
        {
          name: 'remove-dto-validation',
          file: 'presentation/http.ts',
          before: '@Body(new ZodValidationPipe(CreateItemDto))',
          after: '@Body()',
          expected: 'HTTP validates DTO at real route'
        },
        {
          name: 'remove-owner-filter',
          file: 'infrastructure/pg-item-repository.ts',
          before: "'owner_user_id = $1 AND organization_id IS NULL'",
          after: "'$1::text IS NOT NULL'",
          expected: 'HTTP cross-user list and delete isolation'
        },
        {
          name: 'domain-imports-database',
          file: 'domain/item.ts',
          before: null,
          after: "import type { Pool } from 'pg'\n",
          expected: 'internal architecture dependencies'
        }
      ]
const results = []
for (const mutation of mutations) {
  const destination = mkdtempSync(join(tmpdir(), 'ray-skill-mutant-'))
  cpSync(join(source, 'tools'), join(destination, 'tools'), { recursive: true })
  cpSync(join(source, 'EVALUATION-ISOLATION.json'), join(destination, 'EVALUATION-ISOLATION.json'))
  // Read-only dependencies are reused only by the independent verifier, not generation.
  symlinkSync(join(source, 'node_modules'), join(destination, 'node_modules'))
  const file = join(destination, 'tools/skill-evaluation/src', mutation.file)
  const original = readFileSync(file, 'utf8')
  if (mutation.before) assert.ok(original.includes(mutation.before), 'Specimen changed: cannot apply ' + mutation.name)
  writeFileSync(
    file,
    mutation.before ? original.replaceAll(mutation.before, mutation.after) : mutation.after + original
  )
  let exitCode = 0
  try {
    execFileSync(
      process.execPath,
      [join(dirname(fileURLToPath(import.meta.url)), 'verify-generated.mjs'), destination, scenario],
      { timeout: 120000, stdio: 'pipe' }
    )
  } catch (error) {
    exitCode = error.status ?? -1
  }
  const verification = JSON.parse(readFileSync(join(destination, 'verification.json'), 'utf8'))
  const detected = exitCode !== 0 && verification.checks.some(c => c.name === mutation.expected && !c.passed)
  results.push({
    name: mutation.name,
    workspace: destination,
    detected,
    exitCode,
    expected: mutation.expected,
    verificationDigest: sha256(readFileSync(join(destination, 'verification.json')))
  })
}
const report = { source, scenario, mutations: results, passed: results.every(r => r.detected) }
writeFileSync(join(source, 'mutation-verification.json'), JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify(report, null, 2))
if (results.some(r => !r.detected)) process.exitCode = 1
