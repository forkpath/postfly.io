import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const sourceRoot = fileURLToPath(new URL('../../', import.meta.url))

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'ray-clean-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  mkdirSync(join(root, 'scripts'))
  copyFileSync(join(sourceRoot, 'scripts/clean.mjs'), join(root, 'scripts/clean.mjs'))
  copyFileSync(join(sourceRoot, '.gitignore'), join(root, '.gitignore'))
  execFileSync('git', ['init', '--quiet', root])
  const write = (path, content = 'fixture') => {
    mkdirSync(dirname(join(root, path)), { recursive: true })
    writeFileSync(join(root, path), content)
  }
  const run = (...args) =>
    execFileSync(process.execPath, ['scripts/clean.mjs', ...args], { cwd: root, encoding: 'utf8' })
  return { root, write, run }
}

test('preview is non-destructive; clean removes ignored generated output at multiple depths', t => {
  const { root, write, run } = fixture(t)
  const generated = [
    'ios/build/cache',
    'android/build/cache',
    'apps/mobile/ios/Podfile',
    'apps/mobile/android/build/cache',
    'apps/web/.nitro/cache',
    'apps/web/.source/index.ts',
    'apps/web/.vite-temp/cache',
    'apps/web/coverage/report',
    'apps/web/test-results/result',
    'apps/web/playwright-report/index.html',
    'apps/web/blob-report/report.zip',
    'apps/web/.nyc_output/report',
    'libs/example/tsconfig.tsbuildinfo',
    'apps/web/src/routeTree.gen.ts',
    'apps/mobile/expo-env.d.ts',
    'apps/web/vite.config.ts.timestamp-123.mjs',
    '.eslintcache',
    '.nx/cache/output',
    'node_modules/example/index.js',
    'artifacts/ci-metrics/report.json',
    '.vscode/.react/cache'
  ]
  for (const path of generated) {
    write(path)
    assert.equal(spawnSync('git', ['check-ignore', '--quiet', path], { cwd: root }).status, 0, path)
  }
  const preview = run('--dry-run')
  assert.match(preview, /将删除: ios/)
  for (const path of generated) assert.ok(existsSync(join(root, path)), path)
  run()
  for (const path of generated) assert.ok(!existsSync(join(root, path)), path)
})

test('preserves tracked output, deployment configuration, patches, credentials, reports and symlink targets', t => {
  const { root, write, run } = fixture(t)
  const preserved = [
    'config/deployment.json',
    'patches/example.patch',
    '.env',
    'artifacts/migrations/quarantine.jsonl',
    '.nx/custom-config.json',
    'apps/desktop/build-resources/icon.png',
    'libs/example/src/ios/source.ts',
    'apps/web/src/routeTree.gen.ts',
    'build/source.ts'
  ]
  for (const path of preserved) write(path)
  execFileSync('git', ['add', '-f', 'apps/web/src/routeTree.gen.ts', 'build/source.ts'], { cwd: root })
  write('build/.cache/temporary')
  const external = mkdtempSync(join(tmpdir(), 'ray-clean-external-'))
  t.after(() => rmSync(external, { recursive: true, force: true }))
  mkdirSync(join(external, 'dist'))
  writeFileSync(join(external, 'dist/keep'), 'outside')
  symlinkSync(external, join(root, 'linked-directory'))
  symlinkSync(external, join(root, '.cache'))
  symlinkSync(root, join(root, 'cycle'))
  symlinkSync(join(root, 'missing'), join(root, 'broken'))
  run()
  for (const path of preserved) assert.ok(existsSync(join(root, path)), path)
  assert.ok(!existsSync(join(root, 'build/.cache')))
  assert.ok(existsSync(join(external, 'dist/keep')))
  assert.ok(existsSync(join(root, '.cache')))
  for (const path of ['config/deployment.json', 'patches/example.patch', 'apps/desktop/build-resources/icon.png']) {
    assert.equal(spawnSync('git', ['check-ignore', '--quiet', path], { cwd: root }).status, 1, path)
  }
})

test('refuses deletion when Git tracking information is unavailable', t => {
  const { root, write } = fixture(t)
  rmSync(join(root, '.git'), { recursive: true })
  write('dist/keep')
  const result = spawnSync(process.execPath, ['scripts/clean.mjs'], {
    cwd: root,
    env: { ...process.env, GIT_CEILING_DIRECTORIES: dirname(root) },
    encoding: 'utf8'
  })
  assert.equal(result.status, 1)
  assert.ok(existsSync(join(root, 'dist/keep')))
})
