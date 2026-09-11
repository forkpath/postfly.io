import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

export const migrationClasses = new Set(['bootstrap', 'expand', 'contract'])
export const blueGreenMigrationClasses = new Set(['none', 'expand'])

export function readMigrationPolicy(policyPath) {
  const policy = JSON.parse(readFileSync(policyPath, 'utf8'))

  if (policy.schemaVersion !== 1) {
    throw new Error(`unsupported migration policy schemaVersion: ${policy.schemaVersion}`)
  }
  if (!policy.migrations || typeof policy.migrations !== 'object' || Array.isArray(policy.migrations)) {
    throw new Error('migration policy must contain a migrations object')
  }
  if (!Array.isArray(policy.requiredOnlineIndexes) || policy.requiredOnlineIndexes.length === 0) {
    throw new Error('migration policy must contain requiredOnlineIndexes')
  }
  const uniqueIndexes = new Set(policy.requiredOnlineIndexes)
  if (uniqueIndexes.size !== policy.requiredOnlineIndexes.length) {
    throw new Error('requiredOnlineIndexes must not contain duplicates')
  }
  for (const index of policy.requiredOnlineIndexes) {
    if (!/^[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*$/.test(index)) {
      throw new Error(`invalid required online index identifier: ${index}`)
    }
  }

  for (const [migration, contract] of Object.entries(policy.migrations)) {
    if (!contract || typeof contract !== 'object' || Array.isArray(contract)) {
      throw new Error(`migration ${migration} must have a policy contract`)
    }
    if (!migrationClasses.has(contract.class)) {
      throw new Error(`migration ${migration} has unsupported class ${contract.class}`)
    }
    if (!/^[0-9a-f]{64}$/.test(contract.sha256)) {
      throw new Error(`migration ${migration} must have a lowercase SHA-256`)
    }
  }

  return policy
}

export function listMigrationDirectories(migrationsDirectory) {
  return readdirSync(migrationsDirectory, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort()
}

export function validateMigrationPolicyCoverage(policy, migrations) {
  const migrationSet = new Set(migrations)
  const policyMigrations = Object.keys(policy.migrations).sort()
  const missing = migrations.filter(migration => !(migration in policy.migrations))
  const stale = policyMigrations.filter(migration => !migrationSet.has(migration))

  if (missing.length > 0 || stale.length > 0) {
    throw new Error(`migration policy coverage mismatch; missing=[${missing.join(',')}], stale=[${stale.join(',')}]`)
  }
}

export function validateMigrationChecksums(policy, migrationsDirectory, migrations) {
  const mismatches = []
  for (const migration of migrations) {
    const migrationPath = path.join(migrationsDirectory, migration, 'migration.sql')
    const actual = createHash('sha256').update(readFileSync(migrationPath)).digest('hex')
    const expected = policy.migrations[migration].sha256
    if (actual !== expected) {
      mismatches.push(`${migration}:expected=${expected}:actual=${actual}`)
    }
  }

  if (mismatches.length > 0) {
    throw new Error(`immutable migration checksum mismatch; ${mismatches.join(',')}`)
  }
}

export function validateReleaseMigrationClass(migrationClass) {
  if (!blueGreenMigrationClasses.has(migrationClass)) {
    throw new Error(`blue-green release migration class must be none or expand, received ${migrationClass}`)
  }
}

export function createBlueGreenMigrationPlan({ appliedMigrations, expectedClass, migrations, policy }) {
  validateReleaseMigrationClass(expectedClass)
  validateMigrationPolicyCoverage(policy, migrations)

  const migrationSet = new Set(migrations)
  const unknownApplied = [...new Set(appliedMigrations)].filter(migration => !migrationSet.has(migration)).sort()
  if (unknownApplied.length > 0) {
    throw new Error(`database contains migrations absent from the immutable image: ${unknownApplied.join(',')}`)
  }

  const appliedSet = new Set(appliedMigrations)
  const pendingMigrations = migrations.filter(migration => !appliedSet.has(migration))
  const pending = pendingMigrations.map(migration => ({
    id: migration,
    class: policy.migrations[migration].class,
    sha256: policy.migrations[migration].sha256
  }))

  if (expectedClass === 'none' && pending.length > 0) {
    throw new Error(`release declares none but pending migrations exist: ${pendingMigrations.join(',')}`)
  }

  if (expectedClass === 'expand') {
    const unsafe = pending.filter(migration => migration.class !== 'expand')
    if (unsafe.length > 0) {
      throw new Error(
        `blue-green migrator refuses non-expand pending migrations: ${unsafe
          .map(migration => `${migration.id}:${migration.class}`)
          .join(',')}`
      )
    }
  }

  return {
    policySchemaVersion: policy.schemaVersion,
    mode: 'blue-green',
    expectedClass,
    pendingMigrations: pending
  }
}
