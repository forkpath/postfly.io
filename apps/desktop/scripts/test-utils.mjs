import { spawnSync } from 'node:child_process'
import { mkdir, readdir, rm } from 'node:fs/promises'
import path from 'node:path'

export function outputDirectory(profile = 'test', arch = process.env.DESKTOP_ARCH || process.arch) {
  return path.resolve('../../dist/desktop', profile, process.platform, arch)
}
export async function executable(directory) {
  if (process.platform === 'darwin') {
    const names = await readdir(directory)
    const folder = names.find(name => name === 'mac' || name.startsWith('mac-'))
    if (!folder) throw new Error('Missing macOS unpacked app')
    return path.join(directory, folder, 'Ray.app/Contents/MacOS/Ray')
  }
  if (process.platform === 'win32') return path.join(directory, 'win-unpacked/Ray.exe')
  throw new Error('Desktop tests require macOS or Windows')
}
export function packageTest(extraEnv = {}, dir = true) {
  const result = spawnSync(process.execPath, ['scripts/package.mjs', ...(dir ? ['--dir'] : [])], {
    stdio: 'inherit',
    env: { ...process.env, DESKTOP_PROFILE: 'test', ...extraEnv }
  })
  if (result.status !== 0) throw new Error('Test packaging failed')
}
export async function reportDirectory(name) {
  const directory = path.resolve('../../dist/desktop/test-results', name)
  await rm(directory, { recursive: true, force: true })
  await mkdir(directory, { recursive: true })
  return directory
}
export async function mockAuth(application) {
  await application
    .context()
    .route('**/api/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: 'null' }))
}
export async function until(check, timeout = 30000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    const result = await check()
    if (result) return result
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  throw new Error(`Timed out after ${timeout}ms`)
}
