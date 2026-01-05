import { DynamicModule, Global, Module, Provider } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import Redis, { Redis as RedisClient } from 'ioredis'

import { RedisConfig } from './redis.config'
import { REDIS_CLIENT, RedisService } from './redis.service'

@Global()
@Module({})
export class RedisModule {
  static register(): DynamicModule {
    const redisClientProvider: Provider = {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService): Promise<RedisClient> => {
        const { host, port, password } = configService.get<RedisConfig>('redis') as RedisConfig
        return new Redis({
          host,
          port,
          password
        })
      }
    }

    return {
      module: RedisModule,
      providers: [redisClientProvider, RedisService],
      exports: [RedisService]
    }
  }
}
