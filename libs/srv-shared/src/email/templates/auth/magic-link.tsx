import type { EmailTemplate, EmailVariables } from '../types'

import * as React from 'react'

import { Heading, Preview, Text } from '@react-email/components'

import { getOrigin } from '@libs/common'

import { Button } from '../components/button'
import { Layout } from '../components/layout/layout'
import { CommonEmailProps } from '../types'

type Props = EmailVariables[typeof EmailTemplate.MAGIC_LINK] & CommonEmailProps

export const MagicLink = async ({ url, locale }: Props) => {
  const origin = getOrigin(url)

  return (
    <Layout origin={origin} locale={locale}>
      <Preview>Login to TurboStarter with a magic link</Preview>
      <Heading className="leading-tight tracking-tight">Your magic link 🪄</Heading>

      <Text>Almost in! Click the button below to login.</Text>

      <Button href={url}>Login with magic link</Button>

      <Text>Or, copy and paste this link into your browser:</Text>

      <code className="border-border bg-muted inline-block rounded-md border border-solid px-5 py-3.5 font-mono text-xs">
        {url}
      </code>

      <Text className="text-muted-foreground">
        If you didn't try to login, there's nothing to worry about, you can safely ignore this email.
      </Text>
    </Layout>
  )
}

MagicLink.subject = async () => {
  return 'Your magic link 🪄'
}

MagicLink.PreviewProps = {
  url: 'http://localhost:3000/api/auth/magic-link/verify?token=123&callbackURL=/dashboard',
  locale: 'en'
}

export default MagicLink
