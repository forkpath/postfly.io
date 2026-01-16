import type { EmailTemplate, EmailVariables } from './templates/types'

import { send } from './providers'
import { getTemplate } from './templates'

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

    const result = await send({ to, subject, html, text })

    return result
  } catch (error) {
    console.error(error, `Failed to send email ${template} to ${to}`)
    throw error
  }
}

export { sendEmail }
