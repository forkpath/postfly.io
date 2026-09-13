import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'

import { inspectLayers } from './layers.mjs'

test('layer checker catches direct, dynamic, require and barrel violations', t => {
  const root = mkdtempSync(join(tmpdir(), 'ray-layers-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const write = (p, c) => {
    mkdirSync(dirname(join(root, p)), { recursive: true })
    writeFileSync(join(root, p), c)
  }
  write('domain/good.ts', 'export class Entity {}')
  assert.deepEqual(inspectLayers(root), [])
  assert.ok(inspectLayers(root, { requireStructure: true }).some(e => e.reason.includes('usecase')))
  write('application/mixed.ts', "import {Pool} from 'pg'; export class MixedUseCase {}")
  assert.ok(inspectLayers(root).some(e => e.file === 'application/mixed.ts'))
  for (const bad of ["import {Pool} from 'pg'", "await import('pg')", "const p = require('pg')"]) {
    write('domain/bad.ts', bad)
    assert.ok(inspectLayers(root).some(e => e.file === 'domain/bad.ts'))
  }
  write('domain/bad.ts', "export * from '../barrel'")
  write('barrel.ts', "export * from './infrastructure/repository'")
  write('infrastructure/repository.ts', 'export const repo = {}')
  assert.ok(inspectLayers(root).some(e => e.file === 'domain/bad.ts'))
  write('application/use-cases/bad.ts', "import {repo} from '../../infrastructure/repository'")
  assert.ok(inspectLayers(root).some(e => e.file.includes('use-cases')))
  write('application/queries/bad.ts', "import {Repository} from '../../domain/repositories/repo'")
  write('domain/repositories/repo.ts', 'export interface Repository {}')
  assert.ok(inspectLayers(root).some(e => e.file.includes('queries')))
})
