// 确定性维护测试：全程使用临时 fixture，不联网。
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import {
  assess,
  legacyDigest,
  prepare,
  readTree,
  safePath,
  sha256,
  syncSkills,
  treeDiff,
  treeDigest,
  validateManifest,
  writeTree
} from './core.mjs'

const tree = text => ({ 'SKILL.md': { bytes: Buffer.from(text).toString('base64'), executable: false } })
const old = tree('---\nname: sample\ndescription: Fixture skill\n---\nOriginal')
const next = tree('---\nname: sample\ndescription: Fixture skill\n---\nUpdated')
const skill = {
  name: 'sample',
  source: 'owner/repo',
  path: 'skills/sample',
  observedCommit: 'a'.repeat(40),
  installedDigest: treeDigest(old),
  localState: 'matched',
  review: 'compatible',
  reason: 'Fixture reviewed'
}
const manifest = { version: 1, skills: [skill] }
const upstream = { commit: 'b'.repeat(40), tree: next }
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'ray-skills-test-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  writeTree(join(root, '.agents/skills/sample'), old)
  return root
}
test('unchanged content produces no candidate', () =>
  assert.equal(assess(skill, old, { tree: old }).status, 'unchanged'))
test('normal documentation change becomes candidate, not installed update', () =>
  assert.equal(assess(skill, old, upstream).eligible, true))
test('unavailable source fails closed', () => assert.equal(assess(skill, old, null).status, 'source-unavailable'))
test('upstream deletion or path migration requires manual provenance', () =>
  assert.equal(assess(skill, old, { tree: null }).status, 'path-missing'))
test('local modification conflicts, including executable bit', () => {
  assert.equal(assess(skill, next, upstream).status, 'local-conflict')
  const altered = structuredClone(old)
  altered['SKILL.md'].executable = true
  assert.notEqual(treeDigest(old), treeDigest(altered))
})
test('unproven local changes are held', () =>
  assert.equal(assess({ ...skill, localState: 'diverged' }, old, upstream).eligible, false))
test('new scripts are held and never executed', () => {
  const updated = {
    ...next,
    'scripts/run.sh': { bytes: Buffer.from('touch SHOULD_NOT_EXIST').toString('base64'), executable: true }
  }
  assert.equal(assess(skill, old, { tree: updated }).eligible, false)
  assert.equal(existsSync('SHOULD_NOT_EXIST'), false)
})
test('deleted or renamed skill entry cannot become an update candidate', () => {
  assert.equal(assess(skill, old, { tree: {} }).eligible, false)
  assert.equal(assess(skill, old, { tree: tree('---\nname: another\ndescription: moved\n---\nMoved') }).eligible, false)
})
test('custom ray skill excluded from upstream governance', () =>
  assert.throws(() => validateManifest({ version: 1, skills: [{ ...skill, name: 'ray-api-flow' }] }), /custom/))
test('digest stable independent of key order', () => {
  const a = { ...old, 'note.md': next['SKILL.md'] }
  assert.equal(treeDigest(a), treeDigest(Object.fromEntries(Object.entries(a).reverse())))
  assert.equal(treeDiff(old, next).length, 1)
})
test('legacy lock digest ignores modes but governance digest detects them', () => {
  const executable = structuredClone(old)
  executable['SKILL.md'].executable = true
  assert.equal(legacyDigest(old), sha256('SKILL.md' + Buffer.from(old['SKILL.md'].bytes, 'base64').toString()))
  assert.equal(legacyDigest(old), legacyDigest(executable))
  assert.notEqual(treeDigest(old), treeDigest(executable))
})
test('unsafe relative path rejected', () => {
  for (const p of ['../a', '/tmp/a', 'a/../b', 'a\\b', 'a//b']) assert.throws(() => safePath(p))
})
test('symlink content rejected before copy', t => {
  const root = fixture(t)
  symlinkSync('/etc/passwd', join(root, '.agents/skills/sample/escape'))
  assert.throws(() => readTree(join(root, '.agents/skills/sample')), /symlink/)
})
test('prepare isolates candidate and cannot overwrite on repeat', t => {
  const root = fixture(t),
    dest = join(root, 'candidate')
  const entry = {
    name: skill.name,
    source: skill.source,
    upstreamCommit: upstream.commit,
    ...assess(skill, old, upstream)
  }
  const report = { manifestDigest: sha256(JSON.stringify(manifest)), entries: [entry] }
  prepare(root, manifest, report, { sample: upstream }, dest, skill.source)
  assert.equal(treeDigest(readTree(join(root, '.agents/skills/sample'))), skill.installedDigest)
  assert.equal(treeDigest(readTree(join(dest, '.agents/skills/sample'))), treeDigest(next))
  assert.throws(() => prepare(root, manifest, report, { sample: upstream }, dest, skill.source), /exists/)
})
test('report or upstream digest mismatch cannot create partial candidate', t => {
  const root = fixture(t),
    dest = join(root, 'candidate')
  const entry = {
    name: skill.name,
    source: skill.source,
    upstreamCommit: upstream.commit,
    ...assess(skill, old, upstream),
    candidateDigest: '0'.repeat(64)
  }
  const report = { manifestDigest: sha256(JSON.stringify(manifest)), entries: [entry] }
  assert.throws(() => prepare(root, manifest, report, { sample: upstream }, dest, skill.source), /digest/)
  assert.equal(existsSync(dest), false)
  assert.throws(
    () => prepare(root, manifest, { ...report, manifestDigest: 'wrong' }, { sample: upstream }, dest, skill.source),
    /Manifest/
  )
})
test('sync read-only, apply then repeat idempotent', t => {
  const root = fixture(t)
  assert.equal(syncSkills(root).missing.length, 2)
  assert.equal(existsSync(join(root, '.codex')), false)
  assert.equal(syncSkills(root, true).created, 2)
  assert.equal(syncSkills(root, true).created, 0)
  assert.equal(existsSync(join(root, '.claude')), false)
  assert.equal(syncSkills(root).missing.length, 0)
})
test('real directory collision fails all-or-nothing, preserves user content', t => {
  const root = fixture(t),
    path = join(root, '.cursor/skills/sample')
  mkdirSync(path, { recursive: true })
  writeFileSync(join(path, 'owned.txt'), 'keep')
  assert.throws(() => syncSkills(root, true), /Conflicting/)
  assert.equal(readFileSync(join(path, 'owned.txt'), 'utf8'), 'keep')
  assert.equal(existsSync(join(root, '.codex/skills/sample')), false)
})
test('wrong or dangling link is reported, not overwritten', t => {
  const root = fixture(t),
    path = join(root, '.cursor/skills')
  mkdirSync(path, { recursive: true })
  symlinkSync('/missing', join(path, 'sample'))
  assert.throws(() => syncSkills(root, true), /Conflicting/)
})
test('unknown agent entry prevents deletion or silent loss', t => {
  const root = fixture(t),
    path = join(root, '.cursor/skills')
  mkdirSync(path, { recursive: true })
  writeFileSync(join(path, 'personal.md'), 'private')
  assert.throws(() => syncSkills(root, true), /Unknown/)
  assert.equal(readFileSync(join(path, 'personal.md'), 'utf8'), 'private')
})
test('ancestor symlink conflict prevents writes through another directory', t => {
  const root = fixture(t)
  mkdirSync(join(root, 'elsewhere'))
  symlinkSync('elsewhere', join(root, '.cursor'))
  assert.throws(() => syncSkills(root, true), /root symlink/)
  assert.equal(existsSync(join(root, '.codex/skills/sample')), false)
  assert.equal(existsSync(join(root, 'elsewhere/skills')), false)
})
test('retired entry including dangling symlink blocks synchronization without deletion', t => {
  const root = fixture(t)
  symlinkSync('/missing-retired-fixture', join(root, '.claude'))
  assert.throws(() => syncSkills(root, true), /Retired Agent/)
  assert.equal(existsSync(join(root, '.codex')), false)
})
