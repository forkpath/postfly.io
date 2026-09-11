import type { EmailTemplate, EmailVariables } from '@libs/email'

import * as React from 'react'

import { Column, Heading, Preview, Row } from '@react-email/components'

import { getTranslation, isKey } from '@libs/i18n'

import { Layout } from './components/layout/layout'

type Props = EmailVariables[typeof EmailTemplate.CONTACT_FORM]

export const ContactForm = async (props: Props) => {
  const { t, i18n } = await getTranslation({ ns: ['common', 'marketing'] })

  return (
    <Layout>
      <Preview>{t('contact.email.subject')}</Preview>
      <Heading className="leading-tight tracking-tight">{t('contact.email.body')}</Heading>

      {Object.entries(props).map(([key, value]) => (
        <Row key={key}>
          <Column>
            <strong>{isKey(key, i18n, 'common') ? t(`common:${key}`) : key}</strong>: {value}
          </Column>
        </Row>
      ))}
    </Layout>
  )
}

ContactForm.subject = async () => {
  const { t } = await getTranslation({ ns: 'marketing' })
  return t('contact.email.subject')
}

ContactForm.PreviewProps = {
  name: 'John Doe',
  email: 'john.doe@example.com',
  message: "Hello, I'm interested in your services."
}

export default ContactForm
