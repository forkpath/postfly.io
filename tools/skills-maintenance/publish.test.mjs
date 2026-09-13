import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

import { sha256, treeDigest, writeTree } from './core.mjs'
import { validateBundle } from './publish.mjs'

test('publisher rejects custom, altered, executable and changed source bundles', t => {
  const root = mkdtempSync(join(tmpdir(), 'ray-publish-test-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const file = text => ({ bytes: Buffer.from(text).toString('base64'), executable: false })
  const metadata = '---\nname: sample\ndescription: Fixture skill\n---\n'
  const old = { 'SKILL.md': file(metadata + 'before') },
    next = { 'SKILL.md': file(metadata + 'after') }
  writeTree(join(root, '.agents/skills/sample'), old)
  const skill = {
    name: 'sample',
    source: 'owner/repo',
    installedDigest: treeDigest(old),
    localState: 'matched',
    review: 'compatible'
  }
  const manifest = { skills: [skill] }
  const entry = {
    name: 'sample',
    source: 'owner/repo',
    tree: next,
    candidateDigest: treeDigest(next),
    upstreamCommit: 'a'.repeat(40)
  }
  const bundle = {
    source: 'owner/repo',
    entries: [entry],
    digest: sha256(JSON.stringify([['sample', entry.upstreamCommit, treeDigest(next)]]))
  }
  assert.equal(validateBundle(bundle, manifest, root), bundle.digest)
  assert.throws(() => validateBundle({ ...bundle, entries: [{ ...entry, name: 'ray-api-flow' }] }, manifest, root))
  assert.throws(() => validateBundle({ ...bundle, digest: 'wrong' }, manifest, root))
  assert.throws(() => validateBundle({ ...bundle, entries: [{ ...entry, tree: old }] }, manifest, root))
  const executable = structuredClone(next)
  executable['SKILL.md'].executable = true
  assert.throws(
    () =>
      validateBundle(
        { ...bundle, entries: [{ ...entry, tree: executable, candidateDigest: treeDigest(executable) }] },
        manifest,
        root
      ),
    /eligible/
  )
})
test('workflow template is inert, pinned and separates privileged publication', () => {
  const path = fileURLToPath(new URL('./workflows/weekly.yml', import.meta.url))
  const text = readFileSync(path, 'utf8')
  assert.ok(text.includes('workflow_dispatch:'))
  assert.ok(text.includes('# schedule:'))
  assert.ok(text.includes("RAY_SKILLS_MAINTENANCE_ENABLED == 'true'"))
  for (const match of text.matchAll(/uses: ([^\s]+)/g)) assert.match(match[1], /@[a-f0-9]{40}$/)
  const privileged = text.split('  publish:')[1]
  assert.ok(privileged.includes('environment: skills-maintenance-publish'))
  assert.equal(/run:.*(pnpm install|npm install|run-agent|\.agents\/skills)/.test(privileged), false)
})
