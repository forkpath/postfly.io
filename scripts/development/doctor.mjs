import { access, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { childEnvironment, readConfiguration, root, validateConfiguration } from './config.mjs'
import { run } from './process.mjs'

export const compose = ['compose', '-f', 'docker/docker-compose.dev.yml', '--env-file', '.env']

export async function checkTools(env = childEnvironment({})) {
  const manifest = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'))
  if (Number(process.versions.node.split('.')[0]) < 24)
    throw new Error('Node >=24 is required; use the version in .nvmrc')
  const pnpm = await run('pnpm', ['--version'], { env, capture: true, timeout: 30_000 })
  if (`pnpm@${pnpm}` !== manifest.packageManager) throw new Error(`Use ${manifest.packageManager}`)
  console.log(`OK Node ${process.versions.node}, pnpm ${pnpm}`)
  const context =
    env.DOCKER_HOST && !env.DOCKER_CONTEXT
      ? env.DOCKER_HOST
      : await run(
          'docker',
          [
            'context',
            'inspect',
            '--format',
            '{{.Endpoints.docker.Host}}',
            ...(env.DOCKER_CONTEXT ? [env.DOCKER_CONTEXT] : [])
          ],
          { env, capture: true, timeout: 15_000 }
        )
  if (!/^(unix:\/\/|npipe:\/\/)/.test(context))
    throw new Error('Use a local Docker socket/context for bootstrap (remote Docker is refused)')
  await run('docker', ['info', '--format', '{{.ServerVersion}}'], { env, capture: true, timeout: 30_000 })
  await run('docker', ['compose', 'version', '--short'], { env, capture: true, timeout: 15_000 })
  console.log('OK local Docker daemon and Compose')
  return context
}

export async function doctor({ running = false } = {}) {
  let failed = false
  const check = async (label, operation) => {
    try {
      await operation()
      console.log(`OK ${label}`)
    } catch (error) {
      failed = true
      console.error(`FAIL ${label}: ${error.message}`)
    }
  }
  await check('tools', () => checkTools())
  let configuration
  await check('.env', async () => {
    configuration = validateConfiguration(await readConfiguration())
  })
  await check('dependencies', () => access(resolve(root, 'node_modules/.bin/nx')))
  if (running && configuration) {
    const env = childEnvironment(configuration)
    await check('infrastructure', async () => {
      const output = await run('docker', [...compose, 'ps', '--format', 'json'], {
        env,
        capture: true,
        timeout: 30_000
      })
      const services = output
        .split('\n')
        .filter(Boolean)
        .map(line => JSON.parse(line))
      for (const name of ['postgres', 'redis', 'mongo', 'rabbitmq', 'kong']) {
        if (!services.some(service => service.Service === name && service.Health === 'healthy')) {
          throw new Error(`${name} is not healthy; run pnpm docker:dev`)
        }
      }
    })
    for (const [name, url] of readinessUrls(configuration)) {
      await check(name, async () => {
        const result = await fetch(url, { signal: AbortSignal.timeout(15_000), redirect: 'manual' })
        if (!result.ok) throw new Error(`HTTP ${result.status}`)
        await result.text()
      })
    }
  }
  return !failed
}

export function readinessUrls(env) {
  return [
    ['Web through gateway', `${env.PUBLIC_ORIGIN}/`],
    ['Engine through gateway', `${env.PUBLIC_ORIGIN}/api/v1/health`],
    ['Pulse readiness', `http://localhost:${env.PULSE_PORT ?? 3001}/ready`],
    ['Worker readiness', `http://localhost:${env.WORKER_PORT ?? 3002}/ready`]
  ]
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv.slice(2).some(argument => argument !== '--running')) {
    console.error('Usage: pnpm run doctor [--running]')
    process.exitCode = 1
  } else process.exitCode = (await doctor({ running: process.argv.includes('--running') })) ? 0 : 1
}
