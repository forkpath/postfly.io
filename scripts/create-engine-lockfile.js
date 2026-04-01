/**
 * Generates a pruned lockfile for the engine's dist package.json.
 *
 * After `nx run engine:build`, webpack produces dist/services/engine/package.json
 * listing only the externalized dependencies. This script creates a matching
 * pnpm-lock.yaml so `pnpm install --frozen-lockfile` works in the Docker image.
 *
 * This is the Nx-recommended approach for CI/CD deployment:
 * https://nx.dev/docs/guides/ci-deployment
 */
const { createProjectGraphAsync, detectPackageManager } = require('@nx/devkit')
const { createLockFile, getLockFileName } = require('@nx/js')
const { readFileSync, writeFileSync } = require('fs')
const { join } = require('path')

async function main() {
  const distDir = join(__dirname, '..', 'dist', 'services', 'engine')

  const packageJson = JSON.parse(readFileSync(join(distDir, 'package.json'), 'utf8'))

  const projectGraph = await createProjectGraphAsync()
  const pm = detectPackageManager()
  const lockFile = createLockFile(packageJson, projectGraph, pm)
  const lockFileName = getLockFileName(pm)

  writeFileSync(join(distDir, lockFileName), lockFile, 'utf8')
  console.log(`[create-engine-lockfile] Generated ${lockFileName}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
