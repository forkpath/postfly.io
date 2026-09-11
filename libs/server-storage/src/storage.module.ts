import { DynamicModule, Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'

import { createStorageProvider } from './providers'
import { StorageConfig } from './storage.config'
import { STORAGE_PROVIDER, StorageService } from './storage.service'

@Module({})
export class StorageModule {
  static register(): DynamicModule {
    return {
      module: StorageModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: STORAGE_PROVIDER,
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => {
            const config = configService.getOrThrow<StorageConfig>('storage')
            return createStorageProvider(config)
          }
        },
        StorageService
      ],
      exports: [StorageService]
    }
  }
}
