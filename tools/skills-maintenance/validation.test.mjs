import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import { validate } from './cli.mjs'
import { writeTree } from './core.mjs'

test('local skill checks reject invalid metadata, broken routes and unsafe legacy examples', t => {
  const root = mkdtempSync(join(tmpdir(), 'ray-skill-validation-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const names = ['ray-api-flow', 'ray-module-dev', 'ray-rest-api-flow', 'ray-websocket-api-flow']
  const entry = name => '---\nname: ' + name + '\ndescription: Fixture skill\n---\n'
  for (const name of names)
    writeTree(join(root, '.agents/skills', name), {
      'SKILL.md': { bytes: Buffer.from(entry(name)).toString('base64'), executable: false }
    })
  const manifest = { version: 1, skills: [] }
  assert.equal(validate(root, manifest).local, 4)
  writeFileSync(join(root, 'CLAUDE.md'), 'retired fixture')
  assert.throws(() => validate(root, manifest), /Retired Agent/)
  rmSync(join(root, 'CLAUDE.md'))
  const file = join(root, '.agents/skills/ray-api-flow/SKILL.md')
  for (const body of [
    '[missing](references/missing.md)',
    '../ray-missing/SKILL.md',
    '.agents/commands/setup-saas-feature.md',
    '.codex/commands/setup-saas-feature.md',
    "import {auth} from '@libs/auth'",
    'const x = value as never'
  ]) {
    writeFileSync(file, entry('ray-api-flow') + body)
    assert.throws(() => validate(root, manifest), /reference|Obsolete|Unsafe/)
  }
  writeFileSync(file, 'missing frontmatter')
  assert.throws(() => validate(root, manifest), /metadata/)
})
