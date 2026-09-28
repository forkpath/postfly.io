import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { appendFileSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export function verifyImages({ run, images, current, prefix, commit }) {
  assert.match(commit ?? '', /^[a-f0-9]{40}$/, 'A full commit SHA is required')
  assert.match(prefix ?? '', /^[a-z0-9][a-z0-9./_-]+$/, 'Image prefix is required')
  assert.equal(run.project, 'release')
  assert.equal(run.suite, 'artifact')
  assert.equal(run.passed, true, 'Image verification did not pass')
  assert.equal(run.cleaned, true, 'Verification resources were not cleaned')
  assert.equal(run.interrupted, false, 'Verification was interrupted')
  return ['engine', 'web', 'pulse', 'worker', 'migrator'].map(service => {
    const tag = `${prefix}/${service}:${commit}`
    const verified = images.find(image => image.RepoTags?.includes(tag))
    const present = current.find(image => image.RepoTags?.includes(tag))
    assert.match(verified?.Id ?? '', /^sha256:[a-f0-9]{64}$/, `${tag} was not verified`)
    assert.equal(present?.Id, verified.Id, `${tag} changed after verification`)
    return { service, tag }
  })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const report = process.env.VERIFIED_IMAGE_REPORT
  if (!report) throw new Error('VERIFIED_IMAGE_REPORT is required')
  const prefix = process.env.RAY_RELEASE_IMAGE_PREFIX
  const commit = process.env.RAY_RELEASE_IMAGE_TAG
  const images = JSON.parse(readFileSync(resolve(report, 'images.json'), 'utf8'))
  const current = JSON.parse(
    execFileSync('docker', ['image', 'inspect', ...images.flatMap(image => image.RepoTags)], { encoding: 'utf8' })
  )
  const verified = verifyImages({
    run: JSON.parse(readFileSync(resolve(report, 'run.json'), 'utf8')),
    images,
    current,
    prefix,
    commit
  })
  for (const { service, tag } of verified) {
    execFileSync('docker', ['push', tag], { stdio: 'inherit', timeout: 600_000 })
    const [published] = JSON.parse(execFileSync('docker', ['image', 'inspect', tag], { encoding: 'utf8' }))
    const digest = published.RepoDigests.find(value => value.startsWith(`${prefix}/${service}@sha256:`))?.split('@')[1]
    assert.match(digest ?? '', /^sha256:[a-f0-9]{64}$/, `${tag} has no published digest`)
    appendFileSync(process.env.GITHUB_OUTPUT, `${service}=${digest}\n`)
  }
}
