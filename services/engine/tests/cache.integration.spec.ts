import { randomUUID } from 'node:crypto'
import type { TestingModule } from '@nestjs/testing'
import type { Cache } from 'cache-manager'

import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { ConfigModule } from '@nestjs/config'
import { Test } from '@nestjs/testing'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { CacheModule, RedisModule, RedisService } from '@libs/server-redis'

describe('Nest cache and Redis integration', () => {
  let module: TestingModule
  beforeAll(async () => {
    const redis = {
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT),
      password: process.env.REDIS_PASSWORD
    }
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ redis, cache: { ...redis, ttl: 1000, db: 0 } })]
        }),
        CacheModule.register(),
        RedisModule.register()
      ]
    }).compile()
    await module.init()
  })
  afterAll(() => module?.close())

  it('round trips through Redis without duplicate Keyv wrappers or key prefixes', async () => {
    const cache = module.get<Cache>(CACHE_MANAGER)
    const redis = module.get(RedisService)
    const key = `test:${randomUUID()}`
    await cache.set(key, { ready: true }, 60_000)
    expect(await cache.get(key)).toEqual({ ready: true })
    expect(await redis.client.exists(key)).toBe(1)
    expect(await redis.client.pttl(key)).toBeGreaterThan(0)
    await cache.del(key)
    expect(await redis.client.exists(key)).toBe(0)
  })
})
