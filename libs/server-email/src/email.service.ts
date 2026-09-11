import type { EmailSender, SendEmailArgs } from '@libs/email'

import { Inject, Injectable } from '@nestjs/common'

export const EMAIL_SENDER = Symbol('EMAIL_SENDER')

@Injectable()
export class EmailService {
  constructor(@Inject(EMAIL_SENDER) private readonly sender: EmailSender) {}

  async send(args: SendEmailArgs): Promise<void> {
    if (!args.html && !args.text) {
      throw new Error('Either html or text is required to send an email')
    }
    await this.sender(args)
  }
}
