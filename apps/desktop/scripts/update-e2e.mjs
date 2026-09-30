import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createReadStream } from 'node:fs'
import { cp, mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import os from 'node:os'
import path from 'node:path'

import { _electron as electron } from '@playwright/test'

import {
  executable,
  mockAuth,
  outputDirectory,
  packageTest,
  reportDirectory,
  testLaunchArgs,
  until
} from './test-utils.mjs'

// A tilde exercises the file-URL encoding used by Windows short installation paths.
const root = await mkdtemp(path.join(os.tmpdir(), 'ray-update-e2e-~'))
const feed = path.join(root, 'feed')
await mkdir(feed)
let failure = 'none'
const requests = []
const server = createServer(async (request, response) => {
  try {
    const name = path.basename(new URL(request.url, 'http://localhost').pathname)
    requests.push(name)
    if (failure === 'offline') {
      request.socket.destroy()
      return
    }
    if (failure === '404') {
      response.writeHead(404)
      response.end()
      return
    }
    const file = path.join(feed, name)
    const details = await stat(file)
    if (failure === 'corrupt' && /\.(zip|exe)$/.test(name)) {
      response.writeHead(200, { 'Content-Length': 7 })
      response.end('corrupt')
      return
    }
    response.writeHead(200, {
      'Content-Length': details.size,
      'Content-Type': name.endsWith('.yml') ? 'application/yaml' : 'application/octet-stream'
    })
    createReadStream(file).pipe(response)
  } catch {
    response.writeHead(404)
    response.end()
  }
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const base = `http://127.0.0.1:${server.address().port}`
const reports = await reportDirectory('update-e2e')
const installDir = path.join(root, 'installed')
let application
let processLog = ''
const cacheName = `ray-update-test-${path.basename(root).toLowerCase()}`

function stopInstalledWindowsApp() {
  if (process.platform !== 'win32') return
  // Get-Process may expand RUNNER~1 to runneradmin. Match the unique test-owned
  // directory suffix, so the updater's relaunched app cannot escape cleanup.
  const suffix = `\\${path.basename(root)}\\installed\\Ray.exe`.replaceAll("'", "''")
  const result = spawnSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-Command',
      `$ErrorActionPreference = 'Stop'
$owned = @(Get-Process Ray -ErrorAction SilentlyContinue | Where-Object { $_.Path -and $_.Path.EndsWith('${suffix}', [StringComparison]::OrdinalIgnoreCase) })
foreach ($process in $owned) {
  Write-Output ('Stopping test process ' + $process.Id + ' ' + $process.Path)
  try { $process.Kill() } catch { if (-not $process.HasExited) { throw } }
  if (-not $process.WaitForExit(15000)) { throw 'Test process did not exit' }
}
# A child can already be gone after its parent exits. Handled races must not
# leave PowerShell's last-command status as failure; unhandled errors still stop.
exit 0`
    ],
    { encoding: 'utf8', timeout: 30000 }
  )
  processLog += `${result.stdout ?? ''}${result.stderr ?? ''}`
  assert.equal(result.status, 0, `Owned Windows process cleanup failed: ${result.error ?? result.stderr}`)
}

try {
  // Separate cache names prevent false-positive downloads from previous runs.
  const env = { DESKTOP_UPDATE_BASE_URL: base, DESKTOP_TEST_CACHE: cacheName }
  packageTest({ ...env, DESKTOP_TEST_VERSION: '0.1.0' }, process.platform !== 'win32')
  const a = path.join(root, 'a')
  await cp(outputDirectory(), a, { recursive: true, verbatimSymlinks: true })
  packageTest({ ...env, DESKTOP_TEST_VERSION: '0.1.1' }, false)
  const b = outputDirectory()
  for (const name of await readdir(b))
    if (/\.(yml|zip|exe|blockmap)$/.test(name)) await cp(path.join(b, name), path.join(feed, name))
  let executableA = await executable(a)
  const userData = path.join(root, 'user-data')
  await mkdir(userData)
  await writeFile(path.join(userData, 'preserved.txt'), 'user-data-survives-upgrade')
  if (process.platform === 'win32') {
    const installer = (await readdir(a)).find(name => name.endsWith('.exe'))
    const result = spawnSync(path.join(a, installer), ['/S', `/D=${installDir}`], { timeout: 120000 })
    assert.equal(result.status, 0)
    executableA = path.join(installDir, 'Ray.exe')
  }
  application = await electron.launch({
    executablePath: executableA,
    args: testLaunchArgs(userData),
    timeout: 60000
  })
  application.process().stdout.on('data', data => {
    processLog += data
  })
  application.process().stderr.on('data', data => {
    processLog += data
  })
  await mockAuth(application)
  const page = await application.firstWindow({ timeout: 30000 })
  await page.reload()
  await page.getByTestId('updates-open').waitFor()
  const action = name => page.evaluate(name => window.electronAPI.updates[name](), name)
  failure = '404'
  assert.equal((await action('check')).status, 'error')
  failure = 'offline'
  assert.equal((await action('check')).status, 'error')
  failure = 'none'
  const available = await action('check')
  console.log('Available state:', available, 'Requests:', requests)
  assert.equal(available.version, '0.1.1')
  assert.equal((await action('getState')).status, 'available')
  // A check must never download the installer before the user agrees.
  assert(!requests.some(name => /\.(zip|exe)$/.test(name)))
  failure = 'corrupt'
  assert.equal((await action('download')).error, 'download-failed')
  failure = 'none'
  assert.equal((await action('download')).status, 'downloaded')
  assert(requests.some(name => /\.(zip|exe)$/.test(name)))
  await page.screenshot({ path: path.join(reports, 'downloaded.png') })
  let installed = false
  if (process.platform === 'win32') {
    const closed = application.waitForEvent('close', { timeout: 120000 })
    await action('install').catch(() => undefined)
    await closed
    application = undefined
    await until(async () => {
      try {
        const { createRequire } = await import('node:module')
        const { extractFile } = createRequire(import.meta.url)('@electron/asar')
        return (
          JSON.parse(extractFile(path.join(installDir, 'resources/app.asar'), 'package.json').toString()).version ===
          '0.1.1'
        )
      } catch {
        return false
      }
    }, 120000)
    // Stop only the test-installed application before relaunching it under the driver.
    stopInstalledWindowsApp()
    application = await electron.launch({
      executablePath: executableA,
      args: testLaunchArgs(userData),
      timeout: 60000
    })
    assert.equal(await application.evaluate(({ app }) => app.getVersion()), '0.1.1')
    assert.equal(await readFile(path.join(userData, 'preserved.txt'), 'utf8'), 'user-data-survives-upgrade')
    installed = true
  }
  await writeFile(
    path.join(reports, 'result.json'),
    JSON.stringify(
      {
        checks: ['404', 'offline', 'available', 'consent-before-download', 'checksum-failure', 'retry', 'downloaded'],
        installed,
        signing: 'unsigned-test-only',
        macInstallBlocker:
          process.platform === 'darwin' ? 'Developer ID required for signed install/relaunch acceptance' : undefined,
        requests
      },
      null,
      2
    )
  )
  console.log(`Real updater check/download tests passed; installation verified: ${installed}`)
} catch (error) {
  if (application)
    for (const [i, page] of application.windows().entries())
      await page.screenshot({ path: path.join(reports, `failure-${i}.png`) }).catch(() => undefined)
  throw error
} finally {
  await writeFile(path.join(reports, 'requests.json'), JSON.stringify(requests))
  await application?.close().catch(() => undefined)
  server.closeAllConnections()
  await new Promise(resolve => server.close(resolve))
  try {
    stopInstalledWindowsApp()
    // Allow a brief handle-release delay; exhausting retries still fails.
    const removal = { recursive: true, force: true, maxRetries: 3, retryDelay: 300 }
    await rm(root, removal)
    const cacheRoot =
      process.platform === 'darwin' ? path.join(os.homedir(), 'Library/Caches') : process.env.LOCALAPPDATA
    if (cacheRoot) await rm(path.join(cacheRoot, `${cacheName}-updater`), removal)
    await writeFile(path.join(reports, 'cleanup.json'), JSON.stringify({ cleaned: true }))
  } finally {
    await writeFile(path.join(reports, 'process.log'), processLog)
  }
}
