#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  createBlueGreenMigrationPlan,
  listMigrationDirectories,
  readMigrationPolicy,
  validateMigrationChecksums,
  validateMigrationPolicyCoverage,
  validateReleaseMigrationClass
} from './migration-policy.mjs'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const repositoryRoot = path.resolve(scriptDirectory, '../..')

function readOption(name, fallback) {
  const prefix = `--${name}=`
  const argument = process.argv.slice(2).find(value => value.startsWith(prefix))
  return argument ? argument.slice(prefix.length) : fallback
}

function queryAppliedMigrations(databaseUrl) {
  const commonArguments = [databaseUrl, '-X', '-v', 'ON_ERROR_STOP=1', '-Atc']
  const tableExists = execFileSync(
    'psql',
    [
      ...commonArguments,
      "SELECT CASE WHEN to_regclass('public._prisma_migrations') IS NULL THEN 'false' ELSE 'true' END"
    ],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }
  ).trim()

  if (tableExists === 'false') {
    return []
  }
  if (tableExists !== 'true') {
    throw new Error(`unexpected Prisma migration ledger result: ${tableExists}`)
  }

  const output = execFileSync(
    'psql',
    [
      ...commonArguments,
      'SELECT migration_name FROM public._prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name'
    ],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }
  ).trim()

  return output.length === 0 ? [] : output.split('\n')
}

function queryUnreadyOnlineIndexes(databaseUrl, requiredIndexes) {
  const values = requiredIndexes
    .map(index => index.split('.'))
    .map(([schemaName, indexName]) => `('${schemaName}','${indexName}')`)
    .join(',')
  const query = `
    WITH required(schema_name, index_name) AS (VALUES ${values})
    SELECT required.schema_name || '.' || required.index_name
    FROM required
    LEFT JOIN pg_namespace AS namespace
      ON namespace.nspname = required.schema_name
    LEFT JOIN pg_class AS index_relation
      ON index_relation.relnamespace = namespace.oid
      AND index_relation.relname = required.index_name
      AND index_relation.relkind = 'i'
    LEFT JOIN pg_index AS index_definition
      ON index_definition.indexrelid = index_relation.oid
    WHERE index_relation.oid IS NULL
      OR NOT index_definition.indisvalid
      OR NOT index_definition.indisready
    ORDER BY required.schema_name, required.index_name
  `
  const output = execFileSync('psql', [databaseUrl, '-X', '-v', 'ON_ERROR_STOP=1', '-Atc', query], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit']
  }).trim()

  return output.length === 0 ? [] : output.split('\n')
}

function main() {
  const mode = readOption('mode', 'static')
  const migrationsDirectory = path.resolve(
    readOption('migrations-dir', path.join(repositoryRoot, 'libs/pg-dao/src/migrations'))
  )
  const policyPath = path.resolve(readOption('policy', path.join(migrationsDirectory, 'release-policy.json')))
  const releaseIntentPath = path.resolve(
    readOption('release-intent', path.join(repositoryRoot, '.release/migration-class'))
  )
  const migrations = listMigrationDirectories(migrationsDirectory)
  const policy = readMigrationPolicy(policyPath)

  validateMigrationPolicyCoverage(policy, migrations)
  validateMigrationChecksums(policy, migrationsDirectory, migrations)

  if (mode === 'static') {
    const releaseClass = readFileSync(releaseIntentPath, 'utf8').trim()
    validateReleaseMigrationClass(releaseClass)
    process.stdout.write(
      `${JSON.stringify({
        policySchemaVersion: policy.schemaVersion,
        releaseClass,
        migrationCount: migrations.length
      })}\n`
    )
    return
  }

  if (mode !== 'blue-green') {
    throw new Error(`unsupported migration policy mode: ${mode}`)
  }

  const expectedClass = readOption('expected-class', process.env.RELEASE_MIGRATION_CLASS)
  if (!expectedClass) {
    throw new Error('RELEASE_MIGRATION_CLASS or --expected-class is required')
  }
  const databaseUrl = process.env.POSTGRES_DATABASE_URL
  if (!databaseUrl) {
    throw new Error('POSTGRES_DATABASE_URL is required in blue-green mode')
  }

  const plan = createBlueGreenMigrationPlan({
    appliedMigrations: queryAppliedMigrations(databaseUrl),
    expectedClass,
    migrations,
    policy
  })
  if (expectedClass === 'none') {
    const unreadyIndexes = queryUnreadyOnlineIndexes(databaseUrl, policy.requiredOnlineIndexes)
    if (unreadyIndexes.length > 0) {
      throw new Error(`none release requires every online index to be present and valid: ${unreadyIndexes.join(',')}`)
    }
    plan.onlineIndexes = {
      status: 'ready',
      count: policy.requiredOnlineIndexes.length
    }
  }
  process.stdout.write(`${JSON.stringify(plan)}\n`)
}

main()
