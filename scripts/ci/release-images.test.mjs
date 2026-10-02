import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { test } from 'node:test'

import { verifyImages } from '../release/publish-verified-images.mjs'

function fixture() {
  const prefix = 'example.invalid/ray'
  const commit = 'a'.repeat(40)
  const images = ['engine', 'web', 'pulse', 'worker', 'migrator'].map((service, index) => ({
    Id: `sha256:${String(index).repeat(64)}`,
    RepoTags: [`${prefix}/${service}:${commit}`]
  }))
  return {
    prefix,
    commit,
    run: {
      project: 'release',
      suite: 'artifact',
      passed: true,
      cleaned: true,
      interrupted: false,
      gatewayVerified: true
    },
    images,
    current: structuredClone(images)
  }
}

test('the publish gate requires every image from the tested commit', () => {
  assert.equal(verifyImages(fixture()).length, 5)
  const input = fixture()
  input.images.pop()
  assert.throws(() => verifyImages(input), /not verified/)
})

test('failed, interrupted or dirty runs cannot publish', () => {
  for (const field of ['passed', 'cleaned', 'interrupted']) {
    const input = fixture()
    input.run[field] = !input.run[field]
    assert.throws(() => verifyImages(input))
  }
})

test('direct-service evidence without a verified gateway cannot publish', () => {
  for (const value of [false, undefined]) {
    const input = fixture()
    input.run.gatewayVerified = value
    assert.throws(() => verifyImages(input), /not verified through the gateway/)
  }
})

test('retagging a different commit or replacing a tested image prevents publication', () => {
  const input = fixture()
  input.current[0].Id = `sha256:${'f'.repeat(64)}`
  assert.throws(() => verifyImages(input), /changed after verification/)
  const differentCommit = fixture()
  differentCommit.commit = 'b'.repeat(40)
  assert.throws(() => verifyImages(differentCommit), /not verified/)
})

test('the publication command exits before pushing when the artifact test failed', t => {
  const directory = mkdtempSync(resolve(tmpdir(), 'ray-publish-gate-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const input = fixture()
  input.run.passed = false
  writeFileSync(resolve(directory, 'run.json'), JSON.stringify(input.run))
  writeFileSync(resolve(directory, 'images.json'), JSON.stringify(input.images))
  const calls = resolve(directory, 'calls.jsonl')
  writeFileSync(calls, '')
  // A recording command prevents the rehearsal from contacting a real registry.
  writeFileSync(
    resolve(directory, 'docker'),
    `#!${process.execPath}\n` +
      `const fs = require('node:fs'); fs.appendFileSync(${JSON.stringify(calls)}, JSON.stringify(process.argv.slice(2)) + '\\n'); console.log(${JSON.stringify(JSON.stringify(input.current))})\n`,
    { mode: 0o755 }
  )
  const result = spawnSync(process.execPath, ['scripts/release/publish-verified-images.mjs'], {
    env: {
      PATH: directory,
      VERIFIED_IMAGE_REPORT: directory,
      GITHUB_OUTPUT: resolve(directory, 'outputs'),
      RAY_RELEASE_IMAGE_PREFIX: input.prefix,
      RAY_RELEASE_IMAGE_TAG: input.commit
    },
    encoding: 'utf8',
    timeout: 10_000
  })
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /Image verification did not pass/)
  assert.equal(readFileSync(calls, 'utf8').includes('"push"'), false)
})
