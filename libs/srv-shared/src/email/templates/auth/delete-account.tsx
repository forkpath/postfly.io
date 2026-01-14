import type { EmailTemplate, EmailVariables } from '../types'

import * as React from 'react'

import { Heading, Preview, Text } from '@react-email/components'

import { getOrigin } from '@libs/common'

import { Button } from '../components/button'
import { Layout } from '../components/layout/layout'
import { CommonEmailProps } from '../types'

type Props = EmailVariables[typeof EmailTemplate.DELETE_ACCOUNT] & CommonEmailProps

export const DeleteAccount = async ({ url }: Props) => {
  const origin = getOrigin(url)

  return (
    <Layout origin={origin}>
      <Preview>Delete your account for TurboStarter</Preview>
      <Heading className="leading-tight tracking-tight">We're sorry to see you go</Heading>

      <Text>Click the button below to permanently delete your account.</Text>

      <Button href={url}>Delete account</Button>

      <Text>Or, copy and paste this link into your browser:</Text>

      <code className="border-border bg-muted inline-block rounded-md border border-solid px-5 py-3.5 font-mono text-xs">
        {url}
      </code>

      <Text className="text-muted-foreground">
        If you didn't request account deletion, there's nothing to worry about, you can safely ignore this email.
      </Text>
    </Layout>
  )
}

DeleteAccount.subject = async () => {
  return "We're sorry to see you go"
}

DeleteAccount.PreviewProps = {
  url: 'http://localhost:3000/api/auth/delete-user/callback?token=123&callbackURL=/',
  locale: 'en'
}

export default DeleteAccount
