import type { EmailTemplate, EmailVariables } from './types'

import * as React from 'react'

import { Column, Heading, Preview, Row } from '@react-email/components'

import { Layout } from './components/layout/layout'

type Props = EmailVariables[typeof EmailTemplate.CONTACT_FORM]

export const ContactForm = async (props: Props) => {
  return (
    <Layout>
      <Preview>You've received a new contact form submission</Preview>
      <Heading className="leading-tight tracking-tight">New contact form submission</Heading>

      {Object.entries(props).map(([key, value]) => (
        <Row key={key}>
          <Column>
            <strong>{key}</strong>: {value}
          </Column>
        </Row>
      ))}
    </Layout>
  )
}

ContactForm.subject = async () => {
  return "You've received a new contact form submission"
}

ContactForm.PreviewProps = {
  name: 'John Doe',
  email: 'john.doe@example.com',
  message: "Hello, I'm interested in your services."
}

export default ContactForm
