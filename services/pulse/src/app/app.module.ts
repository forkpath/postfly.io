import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

import { PgDaoModule } from '@libs/pg-dao'
import { RedisModule } from '@libs/server-redis'

import { AppController } from './app.controller'
import { AppService } from './app.service'
import { PulseGateway } from './pulse.gateway'

const pulseConfig = () => ({
  redis: {
    host: process.env['REDIS_HOST'] || 'localhost',
    port: Number(process.env['REDIS_PORT'] || 6379),
    password: process.env['REDIS_PASSWORD'] || ''
  }
})

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [pulseConfig] }),
    PgDaoModule.register(),
    RedisModule.register()
  ],
  controllers: [AppController],
  providers: [AppService, PulseGateway]
})
export class AppModule {}
