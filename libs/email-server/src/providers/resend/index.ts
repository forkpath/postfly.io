import type { EmailSender } from '@libs/email'

import { env } from './env'

const from = env.EMAIL_FROM

export const send: EmailSender = async ({ to, subject, html, text }) => {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.RESEND_API_KEY}`
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
