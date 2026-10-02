import { spawnSync } from 'node:child_process'
import { isAbsolute } from 'node:path'

if (!process.env.EXTENSION_BUILD_DIR || !isAbsolute(process.env.EXTENSION_BUILD_DIR))
  throw new Error('Set EXTENSION_BUILD_DIR to the absolute directory of the extracted release archive')

const result = spawnSync('pnpm', ['exec', 'playwright', 'test', '--config', 'playwright.config.mts'], {
  cwd: new URL('..', import.meta.url),
  stdio: 'inherit'
})
if (result.error) throw result.error
process.exitCode = result.status ?? 1
