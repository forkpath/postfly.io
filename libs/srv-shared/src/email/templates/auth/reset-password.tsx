import type { EmailTemplate, EmailVariables } from '../types'

import * as React from 'react'

import { Heading, Preview, Text } from '@react-email/components'

import { getOrigin } from '@libs/common'

import { Button } from '../components/button'
import { Layout } from '../components/layout/layout'
import { CommonEmailProps } from '../types'

type Props = EmailVariables[typeof EmailTemplate.CONFIRM_EMAIL] & CommonEmailProps

export const ResetPassword = async ({ url }: Props) => {
  const origin = getOrigin(url)

  return (
    <Layout origin={origin}>
      <Preview>Reset your password for TurboStarter</Preview>
      <Heading className="leading-tight tracking-tight">Reset your password</Heading>

      <Text>Forgot password? Click the button below to reset your password.</Text>

      <Button href={url}>Reset password</Button>

      <Text>Or, copy and paste this link into your browser:</Text>

      <code className="border-border bg-muted inline-block rounded-md border border-solid px-5 py-3.5 font-mono text-xs">
        {url}
      </code>

      <Text className="text-muted-foreground">
        If you didn't request a password reset, there's nothing to worry about, you can safely ignore this email.
      </Text>
    </Layout>
  )
}

ResetPassword.subject = async () => {
  return 'Reset your password'
}

ResetPassword.PreviewProps = {
  url: 'http://localhost:3000/api/auth/reset-password/KwiyWf9xsTrfndZY5a0stg4p?callbackURL=/auth/password/update',
  locale: 'en'
}

export default ResetPassword
