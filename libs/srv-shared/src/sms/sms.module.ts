import { DynamicModule, Module } from '@nestjs/common'

import { SmsService } from './sms.service'

@Module({})
export class SmsModule {
  static register(): DynamicModule {
    return {
      module: SmsModule,
      providers: [SmsService],
      exports: [SmsService]
    }
  }
}
