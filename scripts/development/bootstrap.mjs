import { setTimeout as delay } from 'node:timers/promises'

import { childEnvironment, createConfiguration, readConfiguration, validateConfiguration } from './config.mjs'
import { withPublicRegistry } from './docker.mjs'
import { checkTools, compose, readinessUrls } from './doctor.mjs'
import { run } from './process.mjs'

const args = process.argv.slice(2)
if (args.includes('--help')) {
  console.log(
    'pnpm bootstrap [--seed] [--start] [--isolated]\n--seed: create development demo accounts\n--start: also run Web/Engine/Pulse/Worker until Ctrl-C\n--isolated: choose free ports for a new .env\nExisting .env is never overwritten. pnpm dev starts services after bootstrap.'
  )
  process.exit(0)
}
if (args.some(arg => !['--seed', '--start', '--isolated', '--dev'].includes(arg)))
  throw new Error('Unknown argument; use --help')
const started = Date.now()
const abort = new AbortController()
let interrupted = false
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    interrupted = true
    abort.abort()
  })
let configuration
try {
  await checkTools()
  if (!args.includes('--dev')) {
    const created = await createConfiguration({ isolated: args.includes('--isolated') })
    console.log(created ? 'Created private .env with random local credentials' : 'Preserved existing .env')
  }
  configuration = validateConfiguration(await readConfiguration(), { seed: args.includes('--seed') })
  const env = childEnvironment(configuration)
  const endpoint = await checkTools(env)
  const options = { env, signal: abort.signal }
  if (!args.includes('--dev')) {
    await run('pnpm', ['install', '--frozen-lockfile'], options)
    await withPublicRegistry(env, endpoint, dockerEnv =>
      run('docker', [...compose, 'up', '-d', '--wait', '--wait-timeout', '180'], { ...options, env: dockerEnv })
    )
    await run('pnpm', ['nx', 'run', 'pg-dao:init'], options)
    if (args.includes('--seed')) {
      await run('pnpm', ['nx', 'run', 'pg-dao:seed'], options)
      const [name, domain] = configuration.SEED_EMAIL.split('@')
      console.log(
        `Demo login: ${name}+user@${domain}; admin: ${name}+admin@${domain}. Password: SEED_PASSWORD in .env (not printed).`
      )
    }
    console.log(
      `Bootstrap completed in ${((Date.now() - started) / 1000).toFixed(1)}s. Run pnpm dev; entry: ${configuration.PUBLIC_ORIGIN}`
    )
  }
  if (args.includes('--start') || args.includes('--dev')) {
    const processResult = run(
      'pnpm',
      ['nx', 'run-many', '-t', 'serve', '-p', 'web,engine,pulse,worker', '--parallel=4', '--outputStyle=stream'],
      { ...options, env: { ...env, NX_DAEMON: 'true' }, timeout: 0 }
    ).then(() => {
      throw new Error('Development servers exited before shutdown')
    })
    const ready = async () => {
      const endpoints = readinessUrls(configuration)
      const announced = new Set()
      let pending = endpoints.map(([name]) => name)
      let stableChecks = 0
      const deadline = Date.now() + 300_000
      while (stableChecks < 2 && Date.now() < deadline) {
        abort.signal.throwIfAborted()
        const checks = await Promise.all(
          endpoints.map(async ([name, url]) => {
            try {
              const result = await fetch(url, {
                signal: AbortSignal.any([abort.signal, AbortSignal.timeout(60_000)]),
                redirect: 'manual'
              })
              await result.text()
              if (result.ok) {
                if (!announced.has(name)) console.log(`Ready: ${name}`)
                announced.add(name)
                return undefined
              }
            } catch {
              /* startup may still be compiling */
            }
            return name
          })
        )
        pending = checks.filter(Boolean)
        stableChecks = pending.length ? 0 : stableChecks + 1
        if (stableChecks < 2) await delay(2_000, undefined, { signal: abort.signal })
      }
      if (stableChecks < 2) throw new Error(`Startup timed out: ${pending.join(', ') || 'services did not stay ready'}`)
      console.log(`Full stack ready in ${((Date.now() - started) / 1000).toFixed(1)}s: ${configuration.PUBLIC_ORIGIN}`)
    }
    try {
      await Promise.race([processResult, ready()])
      await processResult
    } finally {
      abort.abort()
      await processResult.catch(() => {
        // Preserve the startup failure or interruption that initiated shutdown.
      })
    }
  }
} catch (error) {
  if (interrupted) console.log('Development processes stopped. Local databases are preserved.')
  else console.error(`Bootstrap failed: ${error.message}`)
  console.log(
    'Fix the reported problem and rerun; existing .env and data are preserved. Stop local infra with pnpm docker:dev:down.'
  )
  process.exitCode = interrupted ? 130 : 1
}
