import type { EmailTemplate, EmailVariables } from '../types'

import * as React from 'react'

import { Heading, Preview, Text } from '@react-email/components'

import { getOrigin } from '@libs/common'

import { Button } from '../components/button'
import { Layout } from '../components/layout/layout'
import { CommonEmailProps } from '../types'

type Props = EmailVariables[typeof EmailTemplate.CONFIRM_EMAIL] & CommonEmailProps

export const ConfirmEmail = async ({ url }: Props) => {
  const origin = getOrigin(url)

  return (
    <Layout origin={origin}>
      <Preview>Confirm your email address for TurboStarter</Preview>
      <Heading className="leading-tight tracking-tight">Confirm your email address</Heading>

      <Text>One step left! Click the button below to verify your email address.</Text>

      <Button href={url}>Confirm email address</Button>

      <Text>Or, copy and paste this link into your browser:</Text>

      <code className="border-border bg-muted inline-block rounded-md border border-solid px-5 py-3.5 font-mono text-xs">
        {url}
      </code>

      <Text className="text-muted-foreground">
        If you didn't sign up for an account, there's nothing to worry about, you can safely ignore this email.
      </Text>
    </Layout>
  )
}

ConfirmEmail.subject = async () => {
  return 'Confirm your email address'
}

ConfirmEmail.PreviewProps = {
  url: 'http://localhost:3000/api/auth/verify-email?token=123&callbackURL=/dashboard',
  locale: 'en'
}

export default ConfirmEmail
