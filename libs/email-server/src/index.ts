import type { EmailSender, EmailTemplate, EmailVariables } from '@libs/email'

import { getTemplate } from './templates'

// Raw and template sending are distinct contracts for framework adapters.
export const sendRawEmail: EmailSender = async args => {
  const { send } = await import('./providers')
  await send(args)
}

const sendEmail = async <T extends EmailTemplate>({
  to,
  template,
  locale,
  variables
}: {
  to: string
  template: T
  variables: EmailVariables[T]
  locale?: string
}) => {
  try {
    const { html, text, subject } = await getTemplate({
      id: template,
      variables,
      locale
    })

    const result = await sendRawEmail({ to, subject, html, text })

    return result
  } catch (error) {
    console.error(error, `Failed to send email ${template} to ${to}`)
    throw error
  }
}

export { sendEmail }
