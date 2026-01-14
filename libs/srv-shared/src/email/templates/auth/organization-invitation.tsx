import type { EmailTemplate, EmailVariables } from '../types'

import * as React from 'react'

import { Heading, Preview, Text } from '@react-email/components'

import { getOrigin } from '@libs/common'

import { Button } from '../components/button'
import { Layout } from '../components/layout/layout'
import { CommonEmailProps } from '../types'

type Props = EmailVariables[typeof EmailTemplate.ORGANIZATION_INVITATION] & CommonEmailProps

export const OrganizationInvitation = async ({ url, inviter, organization, locale }: Props) => {
  const origin = getOrigin(url)

  return (
    <Layout origin={origin} locale={locale}>
      <Preview>
        {inviter} invited you to join {organization} on TurboStarter
      </Preview>
      <Heading className="leading-tight tracking-tight">You're invited to join {organization}</Heading>

      <Text>
        <strong>{inviter}</strong> invited you to join <strong>{organization}</strong> on TurboStarter. Click the button
        below to accept the invitation.
      </Text>

      <Button href={url}>Join {organization}</Button>

      <Text>Or, copy and paste this link into your browser:</Text>

      <code className="border-border bg-muted inline-block rounded-md border border-solid px-5 py-3.5 font-mono text-xs">
        {url}
      </code>

      <Text className="text-muted-foreground">
        If you weren't expecting this invitation, you can safely ignore this email.
      </Text>
    </Layout>
  )
}

OrganizationInvitation.subject = async () => {
  return "You're invited to join an organization"
}

OrganizationInvitation.PreviewProps = {
  url: 'http://localhost:3000/auth/join?invitationId=h4zI2pKJrQkP5NQljdA8W57wG0V8LHrv',
  locale: 'en',
  inviter: 'John Doe',
  organization: 'Acme Inc'
}

export default OrganizationInvitation
