import type { EmailTemplate, EmailVariables } from '../types'

import * as React from 'react'

import { Heading, Preview, Text } from '@react-email/components'

import { getOrigin } from '@libs/common'
import { getTranslation } from '@libs/i18n'

import { Button } from '../components/button'
import { Layout } from '../components/layout/layout'
import { CommonEmailProps } from '../types'

type Props = EmailVariables[typeof EmailTemplate.DELETE_ACCOUNT] & CommonEmailProps

export const DeleteAccount = async ({ url, locale }: Props) => {
  const { t } = await getTranslation({ locale, ns: 'auth' })
  const origin = getOrigin(url)

  return (
    <Layout origin={origin} locale={locale}>
      <Preview>{t('account.delete.email.preview')}</Preview>
      <Heading className="leading-tight tracking-tight">{t('account.delete.email.subject')}</Heading>

      <Text>{t('account.delete.email.body')}</Text>

      <Button href={url}>{t('account.delete.email.cta')}</Button>

      <Text>{t('account.delete.email.or')}</Text>

      <code className="border-border bg-muted inline-block rounded-md border border-solid px-5 py-3.5 font-mono text-xs">
        {url}
      </code>

      <Text className="text-muted-foreground">{t('account.delete.email.disclaimer')}</Text>
    </Layout>
  )
}

DeleteAccount.subject = async ({ locale }: CommonEmailProps) => {
  const { t } = await getTranslation({ locale, ns: 'auth' })
  return t('account.delete.email.subject')
}

DeleteAccount.PreviewProps = {
  url: 'http://localhost:3000/api/auth/delete-user/callback?token=123&callbackURL=/',
  locale: 'en'
}

export default DeleteAccount
