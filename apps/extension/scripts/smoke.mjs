import { spawnSync } from 'node:child_process'

// Compatibility entry point: validate the production Chromium artifact.
const result = spawnSync('pnpm', ['exec', 'playwright', 'test', '--config', 'playwright.config.mts'], {
  cwd: new URL('..', import.meta.url),
  env: { ...process.env, EXTENSION_BUILD_DIR: 'build/chrome-mv3' },
  stdio: 'inherit'
})
if (result.error) throw result.error
process.exitCode = result.status ?? 1
