import type { CommonEmailProps, EmailTemplate, EmailVariables } from '../types'

import * as React from 'react'

import { Heading, Preview, Text } from '@react-email/components'

import { getOrigin } from '@libs/common'

import { Button } from '../components/button'
import { Layout } from '../components/layout/layout'

type Props = EmailVariables[typeof EmailTemplate.CHANGE_EMAIL] & CommonEmailProps

export const ChangeEmail = async ({ url, locale, newEmail }: Props) => {
  const origin = getOrigin(url)

  return (
    <Layout origin={origin} locale={locale}>
      <Preview>Confirm changing your email address to {newEmail} for TurboStarter</Preview>
      <Heading className="leading-tight tracking-tight">Confirm email address change</Heading>

      <Text>
        You are requesting to change your email address to <strong>{newEmail}</strong>. Click the button below to
        confirm the change.
      </Text>
      <Button href={url}>Confirm change email request</Button>

      <Text>Or, copy and paste this link into your browser:</Text>

      <code className="border-border bg-muted inline-block rounded-md border border-solid px-5 py-3.5 font-mono text-xs">
        {url}
      </code>

      <Text className="text-muted-foreground">
        If you didn't request to change your email address, there's nothing to worry about, you can safely ignore this
        email.
      </Text>
    </Layout>
  )
}

ChangeEmail.subject = async () => {
  return 'Confirm email address change'
}

ChangeEmail.PreviewProps = {
  url: 'http://localhost:3000/api/auth/verify-email?token=123&callbackURL=/dashboard/settings',
  locale: 'en',
  newEmail: 'john@doe.com'
}

export default ChangeEmail
