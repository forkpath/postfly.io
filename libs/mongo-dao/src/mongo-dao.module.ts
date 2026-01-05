import { DynamicModule, Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose'

import { Connection } from 'mongoose'

import { InfographicDao } from './daos/infographic.dao'
import { NotificationDao } from './daos/notification.dao'
import { MongoConfig } from './mongo.config'
import { InfographicDoc, InfographicSchema } from './schemas/infographic.schema'
import { NotificationDoc, NotificationSchema } from './schemas/notification.schema'

@Module({})
export class MongooseDaoModule {
  static register(): DynamicModule {
    return {
      module: MongooseDaoModule,
      imports: [
        MongooseModule.forRootAsync({
          inject: [ConfigService],
          useFactory: (configService: ConfigService): MongooseModuleOptions => {
            const conf = configService.get<MongoConfig>('mongo') as MongoConfig
            return {
              uri: `mongodb://${conf.username}:${encodeURIComponent(conf.password)}@${conf.host}:${conf.port}/${conf.database}`,
              connectionFactory: (connection: any, name: string): any => {
                if (connection instanceof Connection) {
                  connection.set('retryWrites', true)
                  connection.set('writeConcern', { w: 'majority' })
                }
                return connection
              },
              connectTimeoutMS: 5000
            }
          }
        }),
        MongooseModule.forFeature([
          {
            name: InfographicDoc.name,
            schema: InfographicSchema
          },
          {
            name: NotificationDoc.name,
            schema: NotificationSchema
          }
        ])
      ],
      providers: [InfographicDao, NotificationDao],
      exports: [MongooseModule, InfographicDao, NotificationDao]
    }
  }
}
