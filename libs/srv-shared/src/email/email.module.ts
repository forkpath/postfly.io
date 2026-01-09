import { DynamicModule, Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { EMAIL_SENDER, EmailService } from './email.service'
import { createEmailSender, EmailConfig } from './providers'

@Module({})
export class EmailModule {
  static register(): DynamicModule {
    return {
      module: EmailModule,
      providers: [
        {
          provide: EMAIL_SENDER,
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => {
            const config = configService.get<EmailConfig>('email') as EmailConfig
            if (!config) {
              throw new Error('Email config is missing')
            }
            return createEmailSender(config)
          }
        },
        EmailService
      ],
      exports: [EmailService]
    }
  }
}
