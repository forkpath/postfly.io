import { spawnSync } from 'node:child_process'

// A separate artifact with local endpoints and disabled optional providers.
// No authentication bypass or test-only code is added to the application.
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('VITE_')))
const result = spawnSync('pnpm', ['exec', 'wxt', 'build', '--mode', 'e2e'], {
  cwd: new URL('..', import.meta.url),
  env: { ...env, RAY_EXTENSION_E2E: '1', MODE: 'e2e', NODE_ENV: 'production' },
  stdio: 'inherit'
})
if (result.error) throw result.error
process.exitCode = result.status ?? 1
