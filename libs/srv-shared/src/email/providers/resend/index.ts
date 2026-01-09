import { EmailSender } from '../types'

export interface EmailConfig {
  from: string
  apiKey: string
  endpoint?: string
}

export const createEmailSender = (config: EmailConfig): EmailSender => {
  if (!config.apiKey) {
    throw new Error('Resend config is missing')
  }

  const endpoint = config.endpoint ?? 'https://api.resend.com/emails'
  const from = config.from

  return async ({ to, subject, html, text }) => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        html,
        text
      })
    })

    if (!response.ok) {
      throw new Error(`Resend email failed: ${response.status} ${response.statusText}`)
    }
  }
}
