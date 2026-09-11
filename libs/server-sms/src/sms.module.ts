import { DynamicModule, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

import { SmsService } from './sms.service'

@Module({})
export class SmsModule {
  static register(): DynamicModule {
    return {
      module: SmsModule,
      imports: [ConfigModule],
      providers: [SmsService],
      exports: [SmsService]
    }
  }
}
