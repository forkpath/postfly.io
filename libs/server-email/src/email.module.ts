import type { EmailSender } from '@libs/email'

import { DynamicModule, Module } from '@nestjs/common'

import { EMAIL_SENDER, EmailService } from './email.service'

// Resolve provider configuration only when sending, not when importing the library.
const defaultSender: EmailSender = async args => {
  const { sendRawEmail } = await import('@libs/email-server')
  await sendRawEmail(args)
}

@Module({})
export class EmailModule {
  static register(sender: EmailSender = defaultSender): DynamicModule {
    return {
      module: EmailModule,
      providers: [{ provide: EMAIL_SENDER, useValue: sender }, EmailService],
      exports: [EmailService]
    }
  }
}
