import assert from 'node:assert/strict'
import { execFileSync, spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { cp, lstat, mkdir, mkdtemp, readdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { stripVTControlCharacters } from 'node:util'

const root = resolve(import.meta.dirname, '../../..')
if (process.argv.slice(2).some(argument => argument !== '--prove-guards')) throw new Error('Unknown acceptance option')
const proveGuards = process.argv.includes('--prove-guards')
const fixture = await mkdtemp(join(tmpdir(), 'ray-generator-e2e-'))
const report = join(root, 'dist/test-results/ray-plugin', new Date().toISOString().replaceAll(':', '-'))
await mkdir(report, { recursive: true })
const env = Object.fromEntries(
  Object.entries(process.env).filter(([key]) =>
    /^(PATH|HOME|USER|TMPDIR|TEMP|TMP|SYSTEMROOT|COMSPEC|PATHEXT|CI|TERM|LANG|LC_.*|PNPM_HOME|DOCKER_HOST|DOCKER_CONTEXT|DOCKER_CONFIG|DOCKER_CERT_PATH|DOCKER_TLS_VERIFY)$/.test(
      key
    )
  )
)
Object.assign(env, {
  NX_DAEMON: 'false',
  NX_NO_CLOUD: 'true',
  NX_LOAD_DOT_ENV_FILES: 'false',
  DOTENV_CONFIG_PATH: '/dev/null',
  POSTGRES_DATABASE_URL: 'postgresql://fixture:fixture@127.0.0.1:1/ray_test_generator',
  RAY_TEST_COVERAGE: 'true'
})
const steps = []
let active
let interrupted = false
let passed = false
let cleaned = false
function stop() {
  interrupted = true
  active?.()
}
process.once('SIGTERM', stop)
process.once('SIGINT', stop)

async function run(label, command, args, { expectFailure = false } = {}) {
  if (interrupted) throw new Error('Acceptance interrupted')
  console.log(`Generator acceptance: ${label}`)
  const log = createWriteStream(join(report, `${label}.log`))
  const started = Date.now()
  const code = await new Promise((done, fail) => {
    const child = spawn(command, args, {
      cwd: fixture,
      env,
      detached: process.platform !== 'win32',
      stdio: ['ignore', 'pipe', 'pipe']
    })
    child.stdout.pipe(log, { end: false })
    child.stderr.pipe(log, { end: false })
    let escalation
    const kill = signal => {
      try {
        if (process.platform === 'win32') child.kill(signal)
        else process.kill(-child.pid, signal)
      } catch (error) {
        if (error.code !== 'ESRCH') throw error
      }
    }
    active = () => {
      kill('SIGTERM')
      // The backend harness needs time to collect logs and remove its containers/volumes.
      escalation ??= setTimeout(() => kill('SIGKILL'), 60_000)
    }
    const timeout = setTimeout(() => {
      interrupted = true
      active?.()
    }, 900_000)
    function finish() {
      clearTimeout(timeout)
      clearTimeout(escalation)
      active = undefined
    }
    child.once('error', error => {
      finish()
      fail(error)
    })
    child.once('close', value => {
      finish()
      done(value)
    })
  })
  await new Promise(done => log.end(done))
  steps.push({ label, code, seconds: (Date.now() - started) / 1000, expectFailure })
  if (interrupted || (expectFailure ? !Number.isInteger(code) || code === 0 : code !== 0)) {
    throw new Error(`${label}: unexpected exit ${code}; see ${report}`)
  }
}

async function fingerprint() {
  const hashes = {}
  async function visit(directory) {
    for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) =>
      a.name.localeCompare(b.name)
    )) {
      if (['node_modules', '.nx', '.git', 'dist'].includes(entry.name)) continue
      const path = join(directory, entry.name)
      if (entry.isDirectory()) await visit(path)
      else if (entry.isFile())
        hashes[path.slice(fixture.length)] = createHash('sha256')
          .update(await readFile(path))
          .digest('hex')
    }
  }
  await visit(fixture)
  return hashes
}

try {
  const files = execFileSync('git', ['ls-files', '-co', '--exclude-standard', '-z'], { cwd: root, encoding: 'utf8' })
    .split('\0')
    .filter(Boolean)
  for (const path of new Set(files)) {
    if (/(^|\/)\.env(?:\.|$)/.test(path) && !/\.example$/.test(path)) continue
    const source = join(root, path)
    const stat = await lstat(source).catch(error => {
      if (error.code !== 'ENOENT') throw error
    })
    if (!stat?.isFile()) continue
    const destination = join(fixture, path)
    await mkdir(dirname(destination), { recursive: true })
    await cp(source, destination)
  }
  // Dependencies are immutable input here. Generated Prisma code lives inside this copy.
  await symlink(join(root, 'node_modules'), join(fixture, 'node_modules'), 'junction')
  const nx = JSON.parse(await readFile(join(fixture, 'nx.json'), 'utf8'))
  nx.cacheDirectory = '.nx/cache'
  await writeFile(join(fixture, 'nx.json'), JSON.stringify(nx))
  execFileSync('git', ['init', '-q'], { cwd: fixture })
  // Loading the workspace's Vite plugin generates TanStack's ignored route tree.
  // Establish that normal graph output before measuring generator-only writes.
  await run('workspace-graph', 'pnpm', ['nx', 'show', 'project', 'engine', '--json'])
  const authPath = 'libs/pg-dao/src/models/auth.prisma'
  const auth = await readFile(join(fixture, authPath), 'utf8')
  for (const [name, plural, ownership] of [
    ['generator-personal-record', 'generator-personal-records', 'user'],
    ['generator-team-record', 'generator-team-records', 'organization']
  ]) {
    const args = [
      'nx',
      'g',
      '@ray/plugin:resource',
      name,
      `--plural=${plural}`,
      `--ownership=${ownership}`,
      '--no-interactive'
    ]
    const before = await fingerprint()
    await run(`${ownership}-dry-run`, 'pnpm', [...args, '--dry-run'])
    assert.deepEqual(await fingerprint(), before, 'dry-run changed source files')
    await run(`${ownership}-generate`, 'pnpm', args)
    const generated = await fingerprint()
    await run(`${ownership}-overwrite-denied`, 'pnpm', args, { expectFailure: true })
    assert.deepEqual(await fingerprint(), generated, 'refused overwrite changed files')
  }
  assert.equal(await readFile(join(fixture, authPath), 'utf8'), auth, 'generator changed the auth schema')
  await run('prisma-generate', 'pnpm', ['nx', 'run', 'pg-dao:generate'])
  await run('generated-checks', 'pnpm', [
    'nx',
    'run-many',
    '-t',
    'lint,typecheck,typecheck-tests,test',
    '-p',
    'engine,payload,api-client,ray-plugin',
    '--parallel=3',
    '--skipNxCache',
    '--outputStyle=static'
  ])
  await run('http-postgres', 'pnpm', ['nx', 'run', 'engine:e2e'])
  if (proveGuards) {
    const mutations = [
      {
        file: 'services/engine/src/presentation/http/generator-personal-record/generator-personal-record.controller.ts',
        before: 'input: CreateGeneratorPersonalRecordDto',
        after: 'input: object'
      },
      {
        file: 'services/engine/src/infrastructure/repositories/generator-team-record/generator-team-record.repository.ts',
        before: 'where: { id, organizationId: ownerId }',
        after: 'where: { id }'
      }
    ]
    const originals = []
    try {
      for (const mutation of mutations) {
        const path = join(fixture, mutation.file)
        const source = await readFile(path, 'utf8')
        assert.ok(source.includes(mutation.before), `Guard mutation did not match ${mutation.file}`)
        originals.push([path, source])
        await writeFile(path, source.replace(mutation.before, mutation.after))
      }
      await run('guard-proof', 'pnpm', ['nx', 'run', 'engine:e2e'], { expectFailure: true })
      const log = stripVTControlCharacters(await readFile(join(report, 'guard-proof.log'), 'utf8'))
      assert.match(log, /FAIL[^\n]*generator-personal-record\.e2e\.spec\.ts/)
      assert.match(log, /FAIL[^\n]*generator-team-record\.e2e\.spec\.ts/)
      assert.match(log, /expected 500 to be 400/, 'Removing DTO validation must reach the invalid domain input')
      assert.match(log, /expected 200 to be 404/, 'Removing scope must expose the other owner record')
    } finally {
      for (const [path, source] of originals) await writeFile(path, source)
    }
  }
  const backend = join(fixture, 'dist/test-results/engine/e2e')
  const runs = await readdir(backend)
  assert.equal(runs.length, proveGuards ? 2 : 1)
  let successful = 0
  for (const id of runs) {
    const result = JSON.parse(await readFile(join(backend, id, 'run.json'), 'utf8'))
    if (result.passed) successful++
    assert.equal(result.cleaned, true)
  }
  assert.equal(successful, 1)
  passed = true
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
} finally {
  for (const path of ['dist/test-results/engine', 'coverage']) {
    if (await lstat(join(fixture, path)).catch(() => undefined)) {
      await cp(join(fixture, path), join(report, path), { recursive: true })
    }
  }
  await rm(fixture, { recursive: true, force: true })
  cleaned = !(await lstat(fixture).catch(() => undefined))
  await writeFile(join(report, 'acceptance.json'), JSON.stringify({ passed, cleaned, interrupted, steps }, null, 2))
  process.removeListener('SIGTERM', stop)
  process.removeListener('SIGINT', stop)
  console.log(`Generator acceptance report: ${report}`)
}
