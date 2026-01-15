import { DynamicModule, Module } from '@nestjs/common'

import { sendEmail } from '@libs/email'

import { EMAIL_SENDER, EmailService } from './email.service'

@Module({})
export class EmailModule {
  static register(): DynamicModule {
    return {
      module: EmailModule,
      providers: [
        {
          provide: EMAIL_SENDER,
          useValue: sendEmail
        },
        EmailService
      ],
      exports: [EmailService]
    }
  }
}
