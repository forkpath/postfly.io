import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { copyFile, lstat, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { test } from 'node:test'
import { setTimeout as delay } from 'node:timers/promises'

import {
  childEnvironment,
  createConfiguration,
  parseConfiguration,
  readConfiguration,
  root,
  validateConfiguration
} from '../development/config.mjs'
import { withPublicRegistry } from '../development/docker.mjs'
import { redact, run } from '../development/process.mjs'

async function fixture(t) {
  const directory = await mkdtemp(resolve(tmpdir(), 'ray-bootstrap-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  await copyFile(resolve(root, '.env.example'), resolve(directory, '.env.example'))
  return directory
}

test('new configuration uses private random credentials and never overwrites an existing file', async t => {
  const directory = await fixture(t)
  assert.equal(await createConfiguration({ directory, isolated: true }), true)
  const bytes = await readFile(resolve(directory, '.env'))
  const env = validateConfiguration(await readConfiguration(directory), { seed: true })
  assert.equal(env.RAY_DEV_NAMESPACE, env.COMPOSE_PROJECT_NAME)
  assert.equal((await lstat(resolve(directory, '.env'))).mode & 0o777, 0o600)
  assert.equal(
    new Set([
      env.REDIS_PASSWORD,
      env.POSTGRES_PASSWORD,
      env.MONGO_INITDB_ROOT_PASSWORD,
      env.RABBITMQ_DEFAULT_PASSWORD,
      env.SEED_PASSWORD
    ]).size,
    5
  )
  assert.equal(await createConfiguration({ directory, isolated: true }), false)
  assert.deepEqual(await readFile(resolve(directory, '.env')), bytes)
  const other = await fixture(t)
  await createConfiguration({ directory: other, isolated: true })
  assert.notEqual((await readConfiguration(other)).COMPOSE_PROJECT_NAME, env.COMPOSE_PROJECT_NAME)
})

test('symlinks are preserved and refused, including dangling links', async t => {
  const directory = await fixture(t)
  const destination = resolve(directory, 'keep')
  await writeFile(destination, 'do not overwrite')
  await symlink(destination, resolve(directory, '.env'))
  assert.equal(await createConfiguration({ directory }), false)
  await assert.rejects(readConfiguration(directory), /regular file/)
  assert.equal(await readFile(destination, 'utf8'), 'do not overwrite')
  await rm(destination)
  assert.equal(await createConfiguration({ directory }), false)
  await assert.rejects(readConfiguration(directory), /regular file/)
})

test('layered dotenv files cannot override a validated database inside Nx tasks', async t => {
  const directory = await fixture(t)
  await createConfiguration({ directory, isolated: true })
  await writeFile(resolve(directory, '.env.local'), 'POSTGRES_DATABASE_URL=postgresql://other-host/other')
  await assert.rejects(readConfiguration(directory), /single root .env/)
})

test('interpolation never draws a database or password from the calling shell', () => {
  assert.throws(() => parseConfiguration('POSTGRES_DATABASE_URL=${PATH}'), /Missing .env reference/)
  assert.throws(() => parseConfiguration('FIRST=${SECOND}\nSECOND=${FIRST}'), /Circular/)
  assert.throws(() => parseConfiguration('A=${OTHER:-fallback}'), /Unsupported/)
  const env = parseConfiguration('PASSWORD=local\nURI="postgresql://user:${PASSWORD}@localhost/db"')
  assert.equal(env.URI, 'postgresql://user:local@localhost/db')
  assert.equal(childEnvironment({ POSTGRES_DATABASE_URL: env.URI }).POSTGRES_DATABASE_URL, env.URI)
})

test('external databases, connection overrides and missing seed credentials fail closed', async t => {
  const directory = await fixture(t)
  await createConfiguration({ directory, isolated: true })
  const env = await readConfiguration(directory)
  const before = createHash('sha256')
    .update(await readFile(resolve(directory, '.env')))
    .digest('hex')
  for (const patch of [
    { POSTGRES_DATABASE_URL: env.POSTGRES_DATABASE_URL.replace('@localhost:', '@production.example:') },
    { POSTGRES_DATABASE_URL: `${env.POSTGRES_DATABASE_URL}&host=production.example` },
    { POSTGRES_DATABASE_URL: env.POSTGRES_DATABASE_URL.replace('/ray?', '/other?') },
    { MONGO_HOST: 'production.example' },
    { NODE_ENV: 'production' },
    { POSTGRES_PASSWORD: 'ray_password' },
    { RABBITMQ_URI: env.RABBITMQ_URI.replace('@localhost:', '@production.example:') },
    { SEED_PASSWORD: '' }
  ])
    assert.throws(() => validateConfiguration({ ...env, ...patch }, { seed: true }))
  validateConfiguration({ ...env, SEED_PASSWORD: '' })
  assert.equal(
    createHash('sha256')
      .update(await readFile(resolve(directory, '.env')))
      .digest('hex'),
    before
  )
})

test('process failure and interruption propagate; captured output and secret redaction are explicit', async () => {
  const env = childEnvironment({ SEED_PASSWORD: 'a-private-password-value' })
  assert.equal(redact('password=a-private-password-value', env), 'password=[redacted]')
  assert.equal(await run(process.execPath, ['-e', 'console.log("ready")'], { env, capture: true }), 'ready')
  await assert.rejects(run(process.execPath, ['-e', 'process.exit(7)'], { env, capture: true }), /failed \(7\)/)
  const controller = new AbortController()
  const running = run(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { env, signal: controller.signal })
  setTimeout(() => controller.abort(), 200)
  await assert.rejects(running, /failed/)
})

test('public image pull isolates credentials and removes its temporary config after failure', async t => {
  const directory = await fixture(t)
  const original = JSON.stringify({ credsStore: 'private-keychain', auths: { 'private.registry': { auth: 'secret' } } })
  await writeFile(resolve(directory, 'config.json'), original)
  let temporary
  await assert.rejects(
    withPublicRegistry(
      { DOCKER_CONFIG: directory, DOCKER_CONTEXT: 'desktop-linux' },
      'unix:///local.sock',
      async env => {
        temporary = env.DOCKER_CONFIG
        assert.equal(env.DOCKER_CONTEXT, undefined)
        assert.equal(env.DOCKER_HOST, 'unix:///local.sock')
        const config = JSON.parse(await readFile(resolve(temporary, 'config.json'), 'utf8'))
        assert.equal(config.credsStore, undefined)
        assert.equal(config.auths['private.registry'], undefined)
        throw new Error('pull failed')
      }
    ),
    /pull failed/
  )
  await assert.rejects(lstat(temporary), { code: 'ENOENT' })
  assert.equal(await readFile(resolve(directory, 'config.json'), 'utf8'), original)
})

test('interruption also stops a descendant that ignores SIGTERM after its leader exits', async t => {
  const directory = await fixture(t)
  const pidFile = resolve(directory, 'child.pid')
  const program = `
    const child = require('node:child_process').spawn(process.execPath,
      ['-e', 'process.on("SIGTERM", () => {}); setInterval(() => {}, 1000)'], { stdio: 'ignore' });
    require('node:fs').writeFileSync(process.argv[1], String(child.pid));
    process.on('SIGTERM', () => process.exit(0));
    setInterval(() => {}, 1000);
  `
  const controller = new AbortController()
  const running = run(process.execPath, ['-e', program, pidFile], { signal: controller.signal })
  const rejected = assert.rejects(running, /failed/)
  let pid
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      pid = Number(await readFile(pidFile, 'utf8'))
      break
    } catch {
      await delay(20)
    }
  }
  t.after(() => {
    controller.abort()
    if (pid) {
      try {
        process.kill(pid, 'SIGKILL')
      } catch {
        /* already stopped */
      }
    }
  })
  assert.ok(pid)
  await delay(150)
  controller.abort()
  await rejected
  let stopped = false
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      process.kill(pid, 0)
      await delay(20)
    } catch {
      stopped = true
      break
    }
  }
  assert.equal(stopped, true)
})
