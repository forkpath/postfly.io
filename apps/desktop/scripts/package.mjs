import { spawnSync } from 'node:child_process'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'

const require = createRequire(import.meta.url)
const { createConfig } = require('./config.cjs')
const profile = process.argv.includes('--release') ? 'release' : process.env.DESKTOP_PROFILE || 'local'
process.env.DESKTOP_PROFILE = profile
if (profile !== 'release') process.env.CSC_IDENTITY_AUTO_DISCOVERY = 'false'
const config = createConfig()
const arch = process.env.DESKTOP_ARCH || process.arch
// Generated outputs are isolated by profile/platform/architecture. Never reuse stale installers.
await rm(path.resolve(config.directories.output), { recursive: true, force: true })
const args = [
  require.resolve('electron-builder/cli.js'),
  '--config',
  'electron-builder.cjs',
  '--publish',
  'never',
  `--${arch}`
]
if (process.argv.includes('--dir')) args.push('--dir')
const result = spawnSync(process.execPath, args, { stdio: 'inherit', env: process.env })
if (result.status !== 0) process.exit(result.status || 1)
if (profile === 'release') {
  // Written only after builder's signing/notarization steps succeed.
  const directory = path.resolve(config.directories.output)
  await mkdir(directory, { recursive: true })
  await writeFile(
    path.join(directory, 'release.json'),
    JSON.stringify(
      {
        version: config.extraMetadata.version,
        platform: process.platform,
        arch,
        profile,
        updateUrl: config.publish[0].url,
        ref: process.env.GITHUB_REF
      },
      null,
      2
    )
  )
}
