import type { EmailSender } from '@libs/email'

import { Inject, Injectable } from '@nestjs/common'

export type SendEmailArgs = {
  to: string
  subject: string
  html?: string
  text?: string
}

export const EMAIL_SENDER = Symbol('EMAIL_SENDER') as symbol

@Injectable()
export class EmailService {
  constructor(@Inject(EMAIL_SENDER) private readonly send: EmailSender) {}

  async sendEmail(args: SendEmailArgs) {
    if (!args.html && !args.text) {
      throw new Error('Either html or text is required to send an email')
    }

    return this.send(args)
  }
}
