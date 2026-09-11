import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { test } from 'node:test'

import {
  createBlueGreenMigrationPlan,
  validateMigrationChecksums,
  validateMigrationPolicyCoverage,
  validateReleaseMigrationClass
} from './migration-policy.mjs'

const migrations = ['001_bootstrap', '002_expand']
const checksum = value => createHash('sha256').update(value).digest('hex')
const policy = {
  schemaVersion: 1,
  requiredOnlineIndexes: ['public.required_index'],
  migrations: {
    '001_bootstrap': { class: 'bootstrap', sha256: checksum('bootstrap') },
    '002_expand': { class: 'expand', sha256: checksum('expand') }
  }
}

test('accepts only pending expand migrations in an expand release', () => {
  assert.deepEqual(
    createBlueGreenMigrationPlan({
      appliedMigrations: ['001_bootstrap'],
      expectedClass: 'expand',
      migrations,
      policy
    }),
    {
      policySchemaVersion: 1,
      mode: 'blue-green',
      expectedClass: 'expand',
      pendingMigrations: [
        {
          id: '002_expand',
          class: 'expand',
          sha256: checksum('expand')
        }
      ]
    }
  )
})

test('none releases fail when any migration remains pending', () => {
  assert.throws(
    () =>
      createBlueGreenMigrationPlan({
        appliedMigrations: ['001_bootstrap'],
        expectedClass: 'none',
        migrations,
        policy
      }),
    /declares none but pending migrations exist/
  )
})

test('blue-green releases fail closed for bootstrap and contract migrations', () => {
  assert.throws(
    () =>
      createBlueGreenMigrationPlan({
        appliedMigrations: [],
        expectedClass: 'expand',
        migrations,
        policy
      }),
    /001_bootstrap:bootstrap/
  )

  const contractPolicy = {
    schemaVersion: 1,
    requiredOnlineIndexes: ['public.required_index'],
    migrations: {
      '003_contract': { class: 'contract', sha256: checksum('contract') }
    }
  }
  assert.throws(
    () =>
      createBlueGreenMigrationPlan({
        appliedMigrations: [],
        expectedClass: 'expand',
        migrations: ['003_contract'],
        policy: contractPolicy
      }),
    /003_contract:contract/
  )
})

test('policy coverage and database ledger drift are rejected', () => {
  assert.throws(() => validateMigrationPolicyCoverage(policy, ['001_bootstrap']), /stale=\[002_expand\]/)
  assert.throws(
    () =>
      createBlueGreenMigrationPlan({
        appliedMigrations: ['000_unknown'],
        expectedClass: 'expand',
        migrations,
        policy
      }),
    /database contains migrations absent from the immutable image/
  )
})

test('blue-green release intent cannot declare backfill or contract', () => {
  assert.doesNotThrow(() => validateReleaseMigrationClass('none'))
  assert.doesNotThrow(() => validateReleaseMigrationClass('expand'))
  assert.throws(() => validateReleaseMigrationClass('contract'), /must be none or expand/)
  assert.throws(() => validateReleaseMigrationClass('backfill'), /must be none or expand/)
})

test('migration SQL content must match the immutable policy checksum', t => {
  const fixtureRoot = mkdtempSync(path.join(tmpdir(), 'ray-migration-policy-'))
  t.after(() => rmSync(fixtureRoot, { recursive: true, force: true }))
  mkdirSync(path.join(fixtureRoot, '001_bootstrap'))
  mkdirSync(path.join(fixtureRoot, '002_expand'))
  writeFileSync(path.join(fixtureRoot, '001_bootstrap/migration.sql'), 'bootstrap')
  writeFileSync(path.join(fixtureRoot, '002_expand/migration.sql'), 'expand')

  assert.doesNotThrow(() => validateMigrationChecksums(policy, fixtureRoot, migrations))
  writeFileSync(path.join(fixtureRoot, '002_expand/migration.sql'), 'rewritten')
  assert.throws(
    () => validateMigrationChecksums(policy, fixtureRoot, migrations),
    /immutable migration checksum mismatch; 002_expand:/
  )
})
