import { DynamicModule, Global, Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { createStorageProvider } from './providers'
import { StorageConfig } from './storage.config'
import { STORAGE_PROVIDER, StorageService } from './storage.service'

@Global()
@Module({})
export class StorageModule {
  static register(): DynamicModule {
    return {
      module: StorageModule,
      providers: [
        {
          provide: STORAGE_PROVIDER,
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => {
            const config = configService.get<StorageConfig>('storage') as StorageConfig
            if (!config) {
              throw new Error('Storage config is missing')
            }
            return createStorageProvider(config)
          }
        },
        StorageService
      ],
      exports: [StorageService]
    }
  }
}
