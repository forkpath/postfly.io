import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { appendFile, mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

// These fixtures use public, pinned images and locally built release images.
// Do not request a developer's registry credentials or reusable test resources.
process.env.DOCKER_AUTH_CONFIG = '{"auths":{}}'
process.env.TESTCONTAINERS_REUSE_ENABLE = 'false'
process.env.TESTCONTAINERS_RYUK_DISABLED = 'false'
process.env.RYUK_CONTAINER_IMAGE =
  'testcontainers/ryuk:0.14.0@sha256:7c1a8a9a47c780ed0f983770a662f80deb115d95cce3e2daa3d12115b8cd28f0'
const { BackendContainers, backendServices, TEST_RUN_LABEL } = await import('./backend-containers.mjs')

const [project, suite] = process.argv.slice(2)
const releaseArtifacts = project === 'release' && suite === 'artifact'
if (
  !releaseArtifacts &&
  (!['engine', 'pulse', 'worker'].includes(project) || !['e2e', 'integration'].includes(suite))
) {
  throw new Error('Usage: run-backend.mjs <engine|pulse|worker> <integration|e2e>, or release artifact')
}

const root = resolve(import.meta.dirname, '../..')
const runId = randomBytes(8).toString('hex')
const namespace = `ray-test-${runId}`
const database = `ray_test_${runId}`
const password = randomBytes(24).toString('hex')
const reportDir = resolve(root, `dist/test-results/${project}/${suite}/${runId}`)
await mkdir(reportDir, { recursive: true })
const outputLog = createWriteStream(resolve(reportDir, 'runner.log'))

// Only inherit tools/OS settings. Never import a developer's database or SaaS credentials.
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
  NODE_ENV: 'test',
  RAY_TEST_RUN_ID: runId,
  RAY_TEST_REPORT_DIR: reportDir,
  RAY_TEST_DATABASE: database,
  RAY_TEST_PASSWORD: password,
  BETTER_AUTH_SECRET: randomBytes(32).toString('hex'),
  BETTER_AUTH_URL: 'http://127.0.0.1:4178',
  LOGGER_FILE_ENABLED: 'false',
  LOGGER_FILE_COMPRESS: 'false',
  LOGGER_LEVEL: 'warn',
  LOCALE_PATH: resolve(root, 'libs/i18n/src/translations'),
  THROTTLER_LIMIT: '1000',
  PLATFORM_SMOKE_ENABLED: 'true',
  ...(project === 'engine' && suite === 'e2e' ? { ORGANIZATION_BILLING_ENABLED: 'true' } : {}),
  EMAIL_FROM: 'framework-test@example.invalid'
})
if (releaseArtifacts) {
  const prefix = process.env.RAY_RELEASE_IMAGE_PREFIX
  const tag = process.env.RAY_RELEASE_IMAGE_TAG
  if (!/^[a-z0-9][a-z0-9./_-]+$/.test(prefix ?? '') || !/^[a-f0-9]{40}$/.test(tag ?? ''))
    throw new Error('Release image prefix and immutable 40-character commit tag are required')
  env.RAY_RELEASE_IMAGE_PREFIX = prefix
  env.RAY_RELEASE_IMAGE_TAG = tag
}

let activeChild
let interrupted = false
let cleaning = false
function stop(signal) {
  interrupted = true
  process.exitCode = 1
  if (!cleaning && activeChild?.pid) {
    // Stop the Nx process group, including test workers, before removing infra.
    try {
      process.kill(-activeChild.pid, signal)
    } catch {
      /* already exited */
    }
  }
}
process.on('SIGINT', stop)
process.on('SIGTERM', stop)

function run(command, args, { capture = false, includeStderr = false, timeout = 300_000 } = {}) {
  if (interrupted && !cleaning) throw new Error('Test run interrupted')
  return new Promise((resolveResult, reject) => {
    const child = spawn(command, args, { cwd: root, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] })
    activeChild = child
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', chunk => {
      if (capture) stdout += chunk
      else {
        process.stdout.write(chunk)
        outputLog.write(chunk.toString().replaceAll(password, '[test-password]'))
      }
    })
    child.stderr.on('data', chunk => {
      stderr += chunk
      if (capture && includeStderr) stdout += chunk
      if (!capture) {
        process.stderr.write(chunk)
        outputLog.write(chunk.toString().replaceAll(password, '[test-password]'))
      }
    })
    const timer = setTimeout(() => {
      try {
        process.kill(-child.pid, 'SIGKILL')
      } catch {
        /* already exited */
      }
    }, timeout)
    child.on('error', error => {
      clearTimeout(timer)
      if (activeChild === child) activeChild = undefined
      reject(error)
    })
    child.on('close', (code, signal) => {
      clearTimeout(timer)
      if (activeChild === child) activeChild = undefined
      if (code === 0) resolveResult(stdout.trim())
      else reject(new Error(`${command} ${args[0]} failed (${signal ?? code}): ${stderr.slice(-3000)}`))
    })
  })
}

const infrastructure = new BackendContainers({
  namespace,
  database,
  password,
  root,
  progress(message) {
    const line = `[${namespace}] ${message}\n`
    process.stdout.write(line)
    outputLog.write(line)
  },
  assertRunning() {
    if (interrupted) throw new Error('Test run interrupted')
  },
  async inspect(id) {
    return JSON.parse(await run('docker', ['inspect', id], { capture: true }))[0]
  }
})
const port = (service, internal) => infrastructure.port(service, internal)

let passed = false
let cleaned = false
const resources = []
try {
  const services = backendServices(project, suite)
  await infrastructure.start(services)
  const pgPort = await port('postgres', 5432)
  Object.assign(env, {
    POSTGRES_DATABASE_URL: `postgresql://ray_test:${password}@127.0.0.1:${pgPort}/${database}`
  })
  if (services.includes('redis'))
    Object.assign(env, {
      REDIS_HOST: '127.0.0.1',
      REDIS_PORT: await port('redis', 6379),
      REDIS_PASSWORD: password
    })
  if (services.includes('mongo'))
    Object.assign(env, {
      MONGO_HOST: '127.0.0.1',
      MONGO_PORT: await port('mongo', 27017),
      MONGO_INITDB_ROOT_USERNAME: 'ray_test',
      MONGO_INITDB_ROOT_PASSWORD: password,
      MONGO_INITDB_DATABASE: database,
      RABBITMQ_URI: `amqp://ray_test:${password}@127.0.0.1:${await port('rabbitmq', 5672)}/${database}`,
      RAY_TEST_RABBITMQ_MANAGEMENT: `http://127.0.0.1:${await port('rabbitmq', 15672)}`
    })
  // The runner constructs the URL after verifying Docker's loopback mapping.
  // Never migrate a caller-supplied URL or reuse development volumes.
  if (releaseArtifacts) {
    // Capture local image IDs before starting; bind evidence to the images
    // actually executed, even if another process later changes these tags.
    const images = JSON.parse(
      await run(
        'docker',
        [
          'image',
          'inspect',
          ...['engine', 'pulse', 'worker', 'web', 'migrator'].map(
            service => `${env.RAY_RELEASE_IMAGE_PREFIX}/${service}:${env.RAY_RELEASE_IMAGE_TAG}`
          )
        ],
        { capture: true }
      )
    )
    await infrastructure.release({
      prefix: env.RAY_RELEASE_IMAGE_PREFIX,
      tag: env.RAY_RELEASE_IMAGE_TAG,
      secret: env.BETTER_AUTH_SECRET
    })
    for (const service of ['engine', 'pulse', 'worker', 'web', 'migrator']) {
      const actual = await infrastructure.inspect(infrastructure.containers.get(service).getId())
      const expected = images.find(image =>
        image.RepoTags?.includes(`${env.RAY_RELEASE_IMAGE_PREFIX}/${service}:${env.RAY_RELEASE_IMAGE_TAG}`)
      )
      if (!expected || actual.Image !== expected.Id)
        throw new Error(`Release image changed before ${service} validation`)
    }
    Object.assign(env, {
      SMOKE_BASE_URL: `http://127.0.0.1:${await port('web', 3000)}`,
      SMOKE_API_BASE_URL: `http://127.0.0.1:${await port('engine', 8000)}`,
      SMOKE_PULSE_BASE_URL: `http://127.0.0.1:${await port('pulse', 3001)}`
    })
    await run(process.execPath, ['scripts/release/framework-smoke.mjs'])
    await writeFile(resolve(reportDir, 'images.json'), JSON.stringify(images))
  } else {
    await run('pnpm', ['nx', 'run', 'pg-dao:init', '--outputStyle=stream'])
    await run('pnpm', ['nx', 'run', `${project}:${suite}-run`, '--outputStyle=stream'], { timeout: 600_000 })
  }
  passed = !interrupted
} catch (error) {
  console.error(error.message.replaceAll(password, '[test-password]'))
  process.exitCode = 1
} finally {
  cleaning = true
  try {
    const ids = (
      await run('docker', ['ps', '-aq', '--filter', `label=${TEST_RUN_LABEL}=${namespace}`], { capture: true })
    )
      .split(/\s+/)
      .filter(Boolean)
    const logs = []
    for (const id of ids) {
      try {
        const info = await infrastructure.inspect(id)
        resources.push({
          id,
          image: info.Image,
          ports: info.NetworkSettings.Ports,
          volumes: info.Mounts.filter(mount => mount.Type === 'volume').map(mount => mount.Name)
        })
        logs.push(
          await run('docker', ['logs', '--tail', '2000', id], { capture: true, includeStderr: true, timeout: 15_000 })
        )
      } catch (error) {
        logs.push(`Could not collect ${id}: ${error.message}`)
      }
    }
    await writeFile(resolve(reportDir, 'infrastructure.log'), logs.join('\n').replaceAll(password, '[test-password]'))
  } catch (error) {
    console.error(`Could not collect infrastructure logs: ${error.message}`)
  }
  try {
    const stopErrors = await infrastructure.stop()
    for (const error of stopErrors) console.error(`Container stop will use scoped cleanup: ${error.message}`)
    const remaining = await run('docker', ['ps', '-aq', '--filter', `label=${TEST_RUN_LABEL}=${namespace}`], {
      capture: true
    })
    if (remaining) await run('docker', ['rm', '-fv', ...remaining.split(/\s+/)], { timeout: 60_000 })
    if (infrastructure.network) await infrastructure.network.stop()
    const leftovers = await run('docker', ['ps', '-aq', '--filter', `label=${TEST_RUN_LABEL}=${namespace}`], {
      capture: true
    })
    if (leftovers) throw new Error(`Containers remain for ${namespace}`)
    const volumes = new Set((await run('docker', ['volume', 'ls', '-q'], { capture: true })).split(/\s+/))
    if (resources.some(resource => resource.volumes.some(volume => volumes.has(volume)))) {
      throw new Error(`Test volumes remain for ${namespace}`)
    }
    cleaned = true
  } catch (error) {
    console.error(`Test environment cleanup failed: ${error.message}`)
    process.exitCode = 1
  }
  await writeFile(
    resolve(reportDir, 'run.json'),
    JSON.stringify(
      {
        namespace,
        project,
        suite,
        orchestrator: 'testcontainers',
        network: infrastructure.network?.getId(),
        resources,
        passed,
        cleaned,
        interrupted
      },
      null,
      2
    )
  )
  await new Promise(resolveLog => outputLog.end(resolveLog))
  process.removeListener('SIGINT', stop)
  process.removeListener('SIGTERM', stop)
}
if (releaseArtifacts && passed && cleaned && !interrupted && process.env.GITHUB_OUTPUT)
  await appendFile(process.env.GITHUB_OUTPUT, `report=${reportDir}\n`)
