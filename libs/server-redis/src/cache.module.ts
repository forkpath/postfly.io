import { CacheModule as NestCacheModule } from '@nestjs/cache-manager'
import { DynamicModule, Global, Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import KeyvRedis from '@keyv/redis'

import { CacheConfig } from './cache.config'

@Global()
@Module({})
export class CacheModule {
  static register(): DynamicModule {
    return {
      module: CacheModule,
      imports: [
        NestCacheModule.registerAsync({
          inject: [ConfigService],
          useFactory: async (configService: ConfigService) => {
            const { host, port, ttl, password, db } = configService.get<CacheConfig>('cache') as CacheConfig
            return {
              ttl, // milliseconds
              // Nest owns the Keyv wrapper. Passing an ESM Keyv instance to its
              // CJS factory can wrap it twice and break adapter initialization.
              stores: [new KeyvRedis(`redis://:${encodeURIComponent(password)}@${host}:${port}/${db}`)]
            }
          }
        })
      ],
      exports: [NestCacheModule]
    }
  }
}
