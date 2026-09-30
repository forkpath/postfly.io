import { createHash, randomBytes } from 'node:crypto'
import { lstat, readdir, readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { resolve } from 'node:path'
import { parseEnv } from 'node:util'

export const root = resolve(import.meta.dirname, '../..')
export const ports = {
  GATEWAY_DEV_PORT: 8080,
  WEB_PORT: 3000,
  ENGINE_PORT: 8000,
  PULSE_PORT: 3001,
  WORKER_PORT: 3002,
  POSTGRES_PORT: 5432,
  REDIS_PORT: 6379,
  MONGO_PORT: 27017,
  RABBITMQ_PORT: 5672,
  RABBITMQ_MANAGEMENT_PORT: 15672
}

// Expand only references declared in this file. Ambient shell secrets must never
// choose the database that bootstrap migrates or seeds.
export function parseConfiguration(source) {
  const values = parseEnv(source)
  const resolving = new Set()
  function expand(key) {
    if (resolving.has(key)) throw new Error(`Circular .env reference: ${key}`)
    if (!(key in values)) throw new Error(`Missing .env reference: ${key}`)
    resolving.add(key)
    const value = values[key].replace(/\$\{([A-Z][A-Z0-9_]*)\}/g, (_, name) => expand(name))
    resolving.delete(key)
    if (value.includes('${')) throw new Error(`Unsupported .env interpolation in ${key}`)
    return value
  }
  return Object.fromEntries(Object.keys(values).map(key => [key, expand(key)]))
}

export async function readConfiguration(directory = root) {
  // Nx reloads task-specific dotenv files even when values were supplied by its
  // parent. Keep bootstrap deterministic; advanced layered configs use dev:*.
  const directories = [directory]
  for (const group of ['apps', 'services', 'libs']) {
    const parent = resolve(directory, group)
    const entries = await readdir(parent, { withFileTypes: true }).catch(error => {
      if (error.code === 'ENOENT') return []
      throw error
    })
    directories.push(...entries.filter(entry => entry.isDirectory()).map(entry => resolve(parent, entry.name)))
  }
  for (const current of directories) {
    for (const name of await readdir(current)) {
      if (name === '.env.example' || (current === directory && name === '.env')) continue
      if (name.startsWith('.env') || name.endsWith('.env')) {
        throw new Error('bootstrap requires a single root .env; use dev:* for layered environment files')
      }
    }
  }
  const file = resolve(directory, '.env')
  const info = await lstat(file)
  if (!info.isFile() || info.isSymbolicLink()) throw new Error('.env must be a regular file, not a symlink')
  return parseConfiguration(await readFile(file, 'utf8'))
}

function availablePort(port) {
  return new Promise((resolvePort, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(port, '0.0.0.0', () => {
      const selected = server.address().port
      server.close(() => resolvePort(selected))
    })
  })
}

export async function createConfiguration({ directory = root, isolated = false } = {}) {
  // Check before probing ports, but use exclusive creation as the final safeguard.
  try {
    await lstat(resolve(directory, '.env'))
    return false
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  let source = await readFile(resolve(directory, '.env.example'), 'utf8')
  const namespace = `ray-dev-${createHash('sha256').update(directory).digest('hex').slice(0, 10)}`
  const values = {
    COMPOSE_PROJECT_NAME: namespace,
    RAY_DEV_NAMESPACE: namespace,
    BETTER_AUTH_SECRET: randomBytes(32).toString('hex'),
    REDIS_PASSWORD: randomBytes(24).toString('hex'),
    POSTGRES_PASSWORD: randomBytes(24).toString('hex'),
    MONGO_INITDB_ROOT_PASSWORD: randomBytes(24).toString('hex'),
    RABBITMQ_DEFAULT_PASSWORD: randomBytes(24).toString('hex'),
    SEED_EMAIL: 'developer@example.test',
    SEED_PASSWORD: randomBytes(24).toString('hex')
  }
  const allocated = new Set()
  for (const [name, preferred] of Object.entries(ports)) {
    let port = await availablePort(isolated ? 0 : preferred).catch(error => {
      if (error.code !== 'EADDRINUSE') throw error
      return availablePort(0)
    })
    while (allocated.has(port)) port = await availablePort(0)
    allocated.add(port)
    values[name] = String(port)
  }
  for (const key of ['PUBLIC_ORIGIN', 'VITE_URL', 'VITE_API_BASE_URL', 'BETTER_AUTH_URL', 'EXPO_PUBLIC_API_BASE_URL']) {
    values[key] = `http://localhost:${values.GATEWAY_DEV_PORT}`
  }
  values.CORS_ORIGINS = `${values.PUBLIC_ORIGIN},http://localhost:${values.WEB_PORT},http://localhost:4200`
  values.RABBITMQ_URI = 'amqp://${RABBITMQ_DEFAULT_USER}:${RABBITMQ_DEFAULT_PASSWORD}@localhost:${RABBITMQ_PORT}'
  for (const [key, value] of Object.entries(values)) {
    const expression = new RegExp(`^${key}=.*$`, 'm')
    source = expression.test(source) ? source.replace(expression, `${key}=${value}`) : `${source}\n${key}=${value}\n`
  }
  await writeFile(resolve(directory, '.env'), source, { flag: 'wx', mode: 0o600 })
  return true
}

const loopback = host => ['localhost', '127.0.0.1', '[::1]'].includes(host)
export function validateConfiguration(env, { seed = false } = {}) {
  for (const [key, fallback] of Object.entries(ports)) {
    const port = Number(env[key] ?? fallback)
    if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error(`Invalid local port: ${key}`)
  }
  if (env.NODE_ENV && env.NODE_ENV !== 'development') throw new Error('bootstrap only supports NODE_ENV=development')
  for (const key of ['POSTGRES_HOST', 'REDIS_HOST', 'MONGO_HOST']) {
    if (!loopback(env[key])) throw new Error(`${key} must point to this development machine`)
  }
  for (const key of ['POSTGRES_USER', 'POSTGRES_DB', 'MONGO_INITDB_DATABASE', 'RABBITMQ_DEFAULT_USER']) {
    if (!/^[a-zA-Z0-9_-]+$/.test(env[key] ?? '')) throw new Error(`Invalid development setting: ${key}`)
  }
  if (env.COMPOSE_PROJECT_NAME && !/^[a-z0-9][a-z0-9_-]+$/.test(env.COMPOSE_PROJECT_NAME)) {
    throw new Error('Invalid COMPOSE_PROJECT_NAME')
  }
  if (env.RAY_DEV_NAMESPACE && env.RAY_DEV_NAMESPACE !== env.COMPOSE_PROJECT_NAME) {
    throw new Error('RAY_DEV_NAMESPACE must match COMPOSE_PROJECT_NAME')
  }
  for (const key of [
    'BETTER_AUTH_SECRET',
    'REDIS_PASSWORD',
    'POSTGRES_PASSWORD',
    'MONGO_INITDB_ROOT_PASSWORD',
    'RABBITMQ_DEFAULT_PASSWORD'
  ]) {
    if (!env[key] || /^(your_|ray_password$)/.test(env[key])) throw new Error(`Replace the example value for ${key}`)
  }
  if (env.BETTER_AUTH_SECRET.length < 32) throw new Error('BETTER_AUTH_SECRET must contain at least 32 characters')
  function connection(key, protocol, user, password, port, database) {
    let url
    try {
      url = new URL(env[key])
    } catch {
      throw new Error(`Invalid ${key}`)
    }
    if (
      url.protocol !== protocol ||
      !loopback(url.hostname) ||
      decodeURIComponent(url.username) !== env[user] ||
      decodeURIComponent(url.password) !== env[password] ||
      Number(url.port || (protocol === 'amqp:' ? 5672 : 5432)) !== Number(env[port] ?? ports[port]) ||
      (database && decodeURIComponent(url.pathname) !== `/${env[database]}`) ||
      [...url.searchParams.keys()].some(key => !['connect_timeout', 'sslmode'].includes(key))
    ) {
      throw new Error(`${key} must match this local Compose service; external/overridden connections are refused`)
    }
  }
  connection(
    'POSTGRES_DATABASE_URL',
    'postgresql:',
    'POSTGRES_USER',
    'POSTGRES_PASSWORD',
    'POSTGRES_PORT',
    'POSTGRES_DB'
  )
  connection('RABBITMQ_URI', 'amqp:', 'RABBITMQ_DEFAULT_USER', 'RABBITMQ_DEFAULT_PASSWORD', 'RABBITMQ_PORT')
  const origin = `http://localhost:${env.GATEWAY_DEV_PORT ?? ports.GATEWAY_DEV_PORT}`
  for (const key of ['PUBLIC_ORIGIN', 'VITE_URL', 'VITE_API_BASE_URL', 'BETTER_AUTH_URL']) {
    if (env[key] !== origin) throw new Error(`${key} must equal the local gateway origin (${origin})`)
  }
  if (seed && (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(env.SEED_EMAIL ?? '') || (env.SEED_PASSWORD?.length ?? 0) < 12)) {
    throw new Error('--seed requires SEED_EMAIL and SEED_PASSWORD (at least 12 characters) in .env')
  }
  return env
}

export function childEnvironment(configuration) {
  const inherited = Object.fromEntries(
    Object.entries(process.env).filter(([key]) =>
      /^(PATH|HOME|USER|SHELL|TMPDIR|TMP|TEMP|SYSTEMROOT|COMSPEC|PATHEXT|LANG|LC_.*|TERM|PNPM_HOME|DOCKER_HOST|DOCKER_CONTEXT|DOCKER_CONFIG|DOCKER_CERT_PATH|DOCKER_TLS_VERIFY|ELECTRON_MIRROR|HTTPS?_PROXY|NO_PROXY)$/i.test(
        key
      )
    )
  )
  return {
    ...inherited,
    ...configuration,
    NODE_ENV: 'development',
    NX_DAEMON: 'false',
    NX_NO_CLOUD: 'true',
    NX_LOAD_DOT_ENV_FILES: 'true'
  }
}
