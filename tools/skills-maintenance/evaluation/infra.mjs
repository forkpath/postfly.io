// 独立测试基础设施，固定镜像 digest；仅本进程创建的容器可以清理。
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'

import Redis from 'ioredis'
import { Pool } from 'pg'

export async function provision() {
  const prefix = 'ray-skill-eval-' + randomUUID().slice(0, 8),
    password = randomUUID()
  const docker = args => execFileSync('docker', args, { encoding: 'utf8', timeout: 60000 }).trim()
  const ids = []
  let network
  const cleanup = () => {
    const failures = []
    for (const id of ids) {
      try {
        docker(['rm', '--force', id])
      } catch {
        failures.push('container ' + id)
      }
    }
    if (network) {
      try {
        docker(['network', 'rm', network])
      } catch {
        failures.push('network ' + network)
      }
    }
    if (failures.length) throw new Error('Isolated cleanup incomplete: ' + failures.join(', '))
  }
  try {
    network = docker(['network', 'create', '--label', 'ray.skill-evaluation=true', prefix])
    const pg = docker([
      'run',
      '--detach',
      '--rm',
      '--name',
      prefix + '-pg',
      '--label',
      'ray.skill-evaluation=true',
      '--network',
      network,
      '-p',
      '127.0.0.1::5432',
      '--tmpfs',
      '/var/lib/postgresql/data',
      '-e',
      'POSTGRES_USER=ray_eval',
      '-e',
      'POSTGRES_PASSWORD=' + password,
      '-e',
      'POSTGRES_DB=ray_eval',
      'postgres:17@sha256:7958605b474b3d264a969cb3a123d6aa00ad1e1fe9da8a69984dabb704d93317'
    ])
    ids.push(pg)
    const redis = docker([
      'run',
      '--detach',
      '--rm',
      '--name',
      prefix + '-redis',
      '--label',
      'ray.skill-evaluation=true',
      '--network',
      network,
      '-p',
      '127.0.0.1::6379',
      'redis:7-alpine@sha256:6ab0b6e7381779332f97b8ca76193e45b0756f38d4c0dcda72dbb3c32061ab99',
      'redis-server',
      '--save',
      '',
      '--appendonly',
      'no'
    ])
    ids.push(redis)
    const port = (id, internal) => docker(['port', id, internal]).split(':').at(-1)
    const databaseUrl = 'postgresql://ray_eval:' + password + '@127.0.0.1:' + port(pg, '5432/tcp') + '/ray_eval'
    const redisUrl = 'redis://127.0.0.1:' + port(redis, '6379/tcp')
    for (let attempt = 0; attempt < 40; attempt++) {
      const pool = new Pool({ connectionString: databaseUrl, connectionTimeoutMillis: 500 })
      let connection
      try {
        await pool.query('select 1')
        connection = new Redis(redisUrl, { connectTimeout: 500, retryStrategy: () => null, lazyConnect: true })
        connection.on('error', () => {
          /* Readiness connect/ping rejects explicitly. */
        })
        await connection.connect()
        await connection.ping()
        return { databaseUrl, redisUrl, containerIds: ids, network, close: cleanup }
      } catch {
        if (attempt === 39) throw new Error('Isolated PG/Redis readiness failed')
      } finally {
        connection?.disconnect()
        await pool.end()
      }
      await delay(250)
    }
  } catch (error) {
    try {
      cleanup()
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], 'Provision and cleanup failed')
    }
    throw error
  }
}
