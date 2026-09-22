import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'

import { expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const builderRequire = createRequire(require.resolve('electron-builder'))
const { PnpmNodeModulesCollector } = builderRequire(
  'app-builder-lib/out/node-module-collector/pnpmNodeModulesCollector.js'
)

it('collects the requested version from isolated pnpm links without a collector patch', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'ray-collector-'))
  try {
    const store = path.join(root, 'node_modules/.pnpm')
    const updater = path.join(store, 'updater@1.0.0/node_modules/updater')
    const older = path.join(store, 'fs-extra@9.1.0/node_modules/fs-extra')
    const required = path.join(store, 'fs-extra@10.1.0/node_modules/fs-extra')
    for (const [directory, metadata] of [
      [updater, { name: 'updater', version: '1.0.0', dependencies: { 'fs-extra': '^10.1.0' } }],
      [older, { name: 'fs-extra', version: '9.1.0' }],
      [required, { name: 'fs-extra', version: '10.1.0' }]
    ]) {
      await mkdir(directory, { recursive: true })
      await writeFile(path.join(directory, 'package.json'), JSON.stringify(metadata))
    }
    const linkType = process.platform === 'win32' ? 'junction' : 'dir'
    await symlink(updater, path.join(root, 'node_modules/updater'), linkType)
    await symlink(older, path.join(root, 'node_modules/fs-extra'), linkType)
    await symlink(required, path.join(updater, '../fs-extra'), linkType)
    const collector = new PnpmNodeModulesCollector(root, {})
    collector.isHoisted = { value: Promise.resolve(false) }
    await collector.collectDepsRecursively({
      path: root,
      dependencies: {
        updater: {
          version: '1.0.0',
          path: updater,
          dependencies: { 'fs-extra': { version: '10.1.0', path: required } }
        }
      }
    })
    const selected = collector.allDependencies.get('fs-extra@10.1.0').path
    expect(selected).toBe(required)
    expect(JSON.parse(await readFile(path.join(selected, 'package.json'), 'utf8')).version).toBe('10.1.0')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
