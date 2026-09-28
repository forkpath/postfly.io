import { randomUUID } from 'node:crypto'

import { ConfigModule } from '@nestjs/config'
import { Test } from '@nestjs/testing'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { RedisModule, RedisService } from '@libs/server-redis'

describe('Pulse Redis adapter lifecycle', () => {
  let module: Awaited<ReturnType<ReturnType<typeof Test.createTestingModule>['compile']>>
  let redis: RedisService
  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              redis: {
                host: process.env.REDIS_HOST,
                port: Number(process.env.REDIS_PORT),
                password: process.env.REDIS_PASSWORD
              }
            })
          ]
        }),
        RedisModule.register()
      ]
    }).compile()
    await module.init()
    redis = module.get(RedisService)
  })
  afterAll(() => module?.close())

  it('persists structured values and applies expiration through the real client', async () => {
    const key = `test:${randomUUID()}`
    await redis.setObjectAsHash(key, { name: 'framework', state: { ready: true } }, 60)
    expect(await redis.client.hgetall(key)).toEqual({ name: 'framework', state: '{"ready":true}' })
    expect(await redis.client.ttl(key)).toBeGreaterThan(0)
    await redis.setObjectAsHash(key, {})
    expect(await redis.client.exists(key)).toBe(0)
  })
})
