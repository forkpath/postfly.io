import { DynamicModule, Global, Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { PgConfig } from './pg.config'
import { PrismaService } from './prisma.service'

@Global()
@Module({})
export class PgDaoModule {
  static register(): DynamicModule {
    return {
      module: PgDaoModule,
      providers: [
        {
          provide: PrismaService,
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => {
            const databaseUrl = configService.get<PgConfig>('pg')?.databaseUrl ?? ''
            if (!databaseUrl) {
              throw new Error('DATABASE_URL is missing')
            }
            return new PrismaService(databaseUrl)
          }
        }
      ],
      exports: [PrismaService]
    }
  }
}
