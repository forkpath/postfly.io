import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { appendFile, mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

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

const compose = [
  'compose',
  '--env-file',
  '/dev/null',
  '-f',
  resolve(root, 'docker/docker-compose.test.yml'),
  ...(releaseArtifacts ? ['-f', resolve(root, 'docker/docker-compose.release-test.yml')] : []),
  '-p',
  namespace
]
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

function run(command, args, { capture = false, timeout = 300_000 } = {}) {
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
    child.on('error', reject)
    child.on('close', (code, signal) => {
      clearTimeout(timer)
      if (activeChild === child) activeChild = undefined
      if (code === 0) resolveResult(stdout.trim())
      else reject(new Error(`${command} ${args[0]} failed (${signal ?? code}): ${stderr.slice(-3000)}`))
    })
  })
}

async function port(service, internal) {
  const address = await run('docker', [...compose, 'port', service, String(internal)], { capture: true })
  if (!/^127\.0\.0\.1:\d+$/.test(address)) throw new Error(`Unsafe test address: ${address}`)
  return address.split(':')[1]
}

let passed = false
let cleaned = false
try {
  const services =
    suite === 'integration'
      ? project === 'worker'
        ? ['postgres']
        : ['postgres', 'redis']
      : project === 'pulse'
        ? ['postgres', 'redis']
        : project === 'worker'
          ? ['postgres', 'mongo', 'rabbitmq']
          : ['postgres', 'redis', 'mongo', 'rabbitmq']
  await run('docker', [...compose, 'up', '-d', '--wait', '--wait-timeout', '240', ...services])
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
    // Test already-built images. Never rebuild or pull an unverified replacement.
    await run('docker', [...compose, 'run', '--rm', '--pull', 'never', 'migrator'])
    await run('docker', [
      ...compose,
      'up',
      '-d',
      '--pull',
      'never',
      '--wait',
      '--wait-timeout',
      '120',
      'engine',
      'pulse',
      'worker',
      'web'
    ])
    Object.assign(env, {
      SMOKE_BASE_URL: `http://127.0.0.1:${await port('web', 3000)}`,
      SMOKE_API_BASE_URL: `http://127.0.0.1:${await port('engine', 8000)}`,
      SMOKE_PULSE_BASE_URL: `http://127.0.0.1:${await port('pulse', 3001)}`
    })
    await run(process.execPath, ['scripts/release/framework-smoke.mjs'])
    await writeFile(
      resolve(reportDir, 'images.json'),
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
    const logs = await run('docker', [...compose, 'logs', '--no-color'], { capture: true, timeout: 30_000 })
    await writeFile(resolve(reportDir, 'infrastructure.log'), logs.replaceAll(password, '[test-password]'))
  } catch (error) {
    console.error(`Could not collect infrastructure logs: ${error.message}`)
  }
  try {
    await run('docker', [...compose, 'down', '--volumes', '--remove-orphans', '--timeout', '10'], { timeout: 60_000 })
    const remaining = await run('docker', ['ps', '-aq', '--filter', `label=com.docker.compose.project=${namespace}`], {
      capture: true
    })
    if (remaining) throw new Error(`Containers remain for ${namespace}`)
    cleaned = true
  } catch (error) {
    console.error(`Test environment cleanup failed: ${error.message}`)
    process.exitCode = 1
  }
  await writeFile(
    resolve(reportDir, 'run.json'),
    JSON.stringify({ namespace, project, suite, passed, cleaned, interrupted }, null, 2)
  )
  await new Promise(resolveLog => outputLog.end(resolveLog))
  process.removeListener('SIGINT', stop)
  process.removeListener('SIGTERM', stop)
}
if (releaseArtifacts && passed && cleaned && !interrupted && process.env.GITHUB_OUTPUT)
  await appendFile(process.env.GITHUB_OUTPUT, `report=${reportDir}\n`)
