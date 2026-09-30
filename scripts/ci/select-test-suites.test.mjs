import assert from 'node:assert/strict'
import { test } from 'node:test'

import { requiresFullRun, selectTestSuites } from './select-test-suites.mjs'

test('ordinary dev pushes use affected selection; initial, scheduled and explicit full runs retain the complete matrix', () => {
  const input = { eventName: 'push', ref: 'refs/heads/dev', base: 'a'.repeat(40), force: '' }
  assert.equal(requiresFullRun(input), false)
  for (const change of [
    { base: undefined },
    { base: '0'.repeat(40) },
    { eventName: 'schedule' },
    { eventName: 'workflow_dispatch' },
    { force: 'true' },
    { ref: 'refs/tags/v0.1.0' }
  ])
    assert.equal(requiresFullRun({ ...input, ...change }), true)
})

test('documentation-only changes select no device or service suites', () => {
  const result = selectTestSuites({ affected: [], files: ['docs/development/testing.md'], full: false })
  assert.deepEqual(result.backend, [])
  assert.equal(
    Object.values(result).some(value => value === true),
    false
  )
})

test('shared graph dependencies select their consuming backend services', () => {
  const result = selectTestSuites({
    affected: ['pg-dao', 'engine', 'pulse', 'worker'],
    files: ['libs/pg-dao/src/index.ts'],
    full: false
  })
  assert.deepEqual(result.backend, ['engine', 'pulse', 'worker'])
  assert.equal(result.mobileAndroid, false)
})

test('Mobile JS PRs run Android; native configuration changes run both platforms', () => {
  const input = { affected: ['mobile'], files: ['apps/mobile/src/app/index.tsx'], full: false }
  assert.equal(selectTestSuites(input).mobileAndroid, true)
  assert.equal(selectTestSuites(input).mobileIos, false)
  assert.equal(selectTestSuites({ ...input, files: ['apps/mobile/app.config.ts'] }).mobileIos, true)
})

test('harness and workflow changes cannot escape the full framework matrix', () => {
  for (const file of [
    'scripts/testing/run-backend.mjs',
    'scripts/ci/required-checks.mjs',
    'scripts/testing/backend-containers.mjs',
    'docker/engine.Dockerfile',
    'scripts/release/publish-verified-images.mjs',
    'patches/react-native-ios-utilities@5.2.0.patch',
    '.github/workflows/ci.yml'
  ]) {
    const result = selectTestSuites({ affected: [], files: [file], full: false })
    assert.deepEqual(result.backend, ['engine', 'pulse', 'worker'])
    assert.equal(result.mobileIos, true)
    assert.equal(result.extension, true)
    assert.equal(result.desktop, true)
    assert.equal(result.full, true)
  }
})

test('scheduled/full validation selects every runtime without an affected set', () => {
  const result = selectTestSuites({ affected: [], files: [], full: true })
  assert.deepEqual(result.backend, ['engine', 'pulse', 'worker'])
  assert.equal(result.web && result.mobileIos && result.mobileAndroid && result.extension && result.desktop, true)
  assert.equal(result.generator, true)
})

test('generator changes run generated HTTP acceptance without selecting native devices', () => {
  const result = selectTestSuites({
    affected: ['ray-plugin'],
    files: ['tools/ray-plugin/src/generators/resource/generator.cjs'],
    full: false
  })
  assert.equal(result.generator, true)
  assert.equal(result.mobileAndroid || result.mobileIos || result.desktop, false)
})
