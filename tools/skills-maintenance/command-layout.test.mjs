import assert from 'node:assert/strict'
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import { assertNoLegacyCommands, LEGACY_COMMAND_PATHS, overlayCursorCommands } from './command-layout.mjs'
import { syncSkills } from './core.mjs'

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'ray-command-layout-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  mkdirSync(join(root, '.agents/skills/sample'), { recursive: true })
  mkdirSync(join(root, '.cursor/commands'), { recursive: true })
  writeFileSync(join(root, '.cursor/commands/custom.md'), 'Cursor-owned workflow\n')
  return root
}

test('skills sync preserves Cursor commands and never creates command mirrors', t => {
  const root = fixture(t)
  assert.equal(syncSkills(root, true).created, 2)
  assert.equal(syncSkills(root, true).created, 0)
  assert.equal(readFileSync(join(root, '.cursor/commands/custom.md'), 'utf8'), 'Cursor-owned workflow\n')
  assert.equal(lstatSync(join(root, '.cursor/commands/custom.md')).isSymbolicLink(), false)
  for (const path of LEGACY_COMMAND_PATHS) assert.equal(existsSync(join(root, path)), false)
  assert.throws(() => syncSkills(root, 'commands'), /only skills/)
})

test('retired command directories and dangling links fail before any skill writes', t => {
  for (const path of LEGACY_COMMAND_PATHS) {
    const root = fixture(t)
    mkdirSync(join(root, '.codex'), { recursive: true })
    symlinkSync('/missing-command-fixture', join(root, path))
    assert.throws(() => syncSkills(root, true), /Retired command/)
    assert.equal(existsSync(join(root, '.codex/skills')), false)
    assert.equal(lstatSync(join(root, path)).isSymbolicLink(), true)
  }
})

test('new evaluation overlay replaces archived command links without following them', t => {
  const source = fixture(t),
    destination = fixture(t)
  mkdirSync(join(destination, '.agents/commands'), { recursive: true })
  mkdirSync(join(destination, '.codex/commands'), { recursive: true })
  writeFileSync(join(destination, '.agents/commands/old.md'), 'baseline')
  symlinkSync('../../.agents/commands/old.md', join(destination, '.codex/commands/old.md'))
  symlinkSync('../../.agents/commands/old.md', join(destination, '.cursor/commands/old.md'))
  overlayCursorCommands(source, destination)
  assertNoLegacyCommands(destination)
  assert.equal(existsSync(join(destination, '.cursor/commands/old.md')), false)
  assert.equal(lstatSync(join(destination, '.cursor/commands/custom.md')).isFile(), true)
  assert.equal(readFileSync(join(destination, '.cursor/commands/custom.md'), 'utf8'), 'Cursor-owned workflow\n')
  overlayCursorCommands(source, destination)
  assertNoLegacyCommands(destination)
})

test('invalid command source aborts overlay before archived content is removed', t => {
  const source = fixture(t),
    destination = fixture(t)
  symlinkSync('/missing-command-fixture', join(source, '.cursor/commands/bad.md'))
  assert.throws(() => overlayCursorCommands(source, destination), /regular file/)
  assert.equal(readFileSync(join(destination, '.cursor/commands/custom.md'), 'utf8'), 'Cursor-owned workflow\n')
})
