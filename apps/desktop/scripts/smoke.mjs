import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'

import { FuseV1Options, getCurrentFuseWire } from '@electron/fuses'

import { executable, outputDirectory, reportDirectory, testLaunchArgs } from './test-utils.mjs'

const require = createRequire(import.meta.url)
const { listPackage, extractFile } = require('@electron/asar')
const root = await mkdtemp(path.join(os.tmpdir(), 'ray-smoke-'))
const reports = await reportDirectory('smoke')
try {
  const source = await executable(outputDirectory(process.env.DESKTOP_SMOKE_PROFILE || 'local'))
  const sourceRoot = process.platform === 'darwin' ? path.resolve(source, '../../..') : path.dirname(source)
  const copiedRoot = path.join(root, process.platform === 'darwin' ? 'Ray.app' : 'Ray')
  await cp(sourceRoot, copiedRoot, { recursive: true, verbatimSymlinks: true })
  const binary =
    process.platform === 'darwin' ? path.join(copiedRoot, 'Contents/MacOS/Ray') : path.join(copiedRoot, 'Ray.exe')
  const resources =
    process.platform === 'darwin' ? path.join(copiedRoot, 'Contents/Resources') : path.join(copiedRoot, 'resources')
  const fuseBinary = process.platform === 'darwin' ? copiedRoot : binary
  const fuses = await getCurrentFuseWire(fuseBinary)
  assert.equal(fuses[FuseV1Options.RunAsNode], 48)
  assert.equal(fuses[FuseV1Options.EnableNodeCliInspectArguments], 48)
  assert.equal(fuses[FuseV1Options.EnableNodeOptionsEnvironmentVariable], 48)
  assert.equal(fuses[FuseV1Options.OnlyLoadAppFromAsar], 49)
  assert.equal(fuses[FuseV1Options.EnableCookieEncryption], 49)
  assert.equal(fuses[FuseV1Options.EnableEmbeddedAsarIntegrityValidation], 49)
  if (process.platform === 'darwin') assert((await readFile(path.join(resources, 'icon.icns'))).length > 100)
  const archive = path.join(resources, 'app.asar')
  const files = listPackage(archive).map(file => file.replaceAll('\\', '/'))
  assert(files.some(file => file.includes('electron-updater/package.json')))
  assert(files.some(file => file.includes('@sentry/electron/package.json')))
  assert(!files.some(file => /node_modules\/(?:@nestjs|expo|react-native|prisma)(?:\/|$)/.test(file)))
  const packageFiles = new Set(
    files
      .map(file => file.replace(/^\//, ''))
      .filter(file => /(?:^|\/)node_modules\/(?:@[^/]+\/)?[^/]+\/package\.json$/.test(file))
  )
  // Check every declared production dependency, including lazy-loaded branches.
  // A successful first window alone can miss a dependency collected at the wrong level.
  for (const file of ['package.json', ...packageFiles]) {
    // ASAR traverses paths using the host separator; dependency lookup stays POSIX.
    const dependencyPackage = JSON.parse(extractFile(archive, path.normalize(file)).toString())
    for (const dependency of Object.keys(dependencyPackage.dependencies || {})) {
      if (dependencyPackage.optionalDependencies?.[dependency]) continue
      let directory = path.posix.dirname(file)
      let found = false
      while (true) {
        if (packageFiles.has(path.posix.join(directory, 'node_modules', dependency, 'package.json'))) {
          found = true
          break
        }
        if (directory === '.') break
        directory = path.posix.dirname(directory)
      }
      assert(found, `Missing packaged dependency ${dependencyPackage.name} -> ${dependency}`)
    }
  }
  const metadata = JSON.parse(extractFile(archive, 'package.json').toString())
  if (metadata.desktopUpdatesEnabled)
    assert((await readFile(path.join(resources, 'app-update.yml'), 'utf8')).includes('https:'))
  const { mkdir } = await import('node:fs/promises')
  const userData = path.join(root, 'user-data')
  await mkdir(userData)
  const child = spawn(binary, ['--desktop-smoke', ...testLaunchArgs(userData)], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe']
  })
  let logs = ''
  child.stdout.on('data', data => {
    logs += data
  })
  child.stderr.on('data', data => {
    logs += data
  })
  const timeout = setTimeout(() => child.kill('SIGKILL'), 45000)
  const [code] = await once(child, 'exit')
  clearTimeout(timeout)
  await writeFile(path.join(reports, 'process.log'), logs)
  assert.equal(code, 0, logs)
  const report = JSON.parse(await readFile(path.join(userData, 'desktop-smoke.json'), 'utf8'))
  assert.equal(report.packaged, true)
  assert.equal(report.preload, true)
  assert.equal(report.entry, true)
  assert.equal(report.nodeIntegration, false)
  await writeFile(
    path.join(reports, 'result.json'),
    JSON.stringify({ ...report, fuses, fileCount: files.length, dependencyPackages: packageFiles.size }, null, 2)
  )
  console.log('Production-fuse, detached packaged application smoke passed')
} finally {
  await rm(root, { recursive: true, force: true })
}
