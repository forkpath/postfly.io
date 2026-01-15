export type SendEmailArgs = {
  to: string
  subject: string
  html?: string
  text?: string
}

export type EmailSender = (args: SendEmailArgs) => Promise<void>
