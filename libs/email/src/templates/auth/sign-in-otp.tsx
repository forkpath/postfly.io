import type { EmailTemplate, EmailVariables } from '../types'

import * as React from 'react'

import { Heading, Preview, Text } from '@react-email/components'

import { getTranslation } from '@libs/i18n'

import { Layout } from '../components/layout/layout'
import { CommonEmailProps } from '../types'

type Props = EmailVariables[typeof EmailTemplate.SIGN_IN_OTP] & CommonEmailProps

export const SignInOtp = async ({ otp, locale }: Props) => {
  const { t } = await getTranslation({ locale, ns: 'auth' })

  return (
    <Layout locale={locale}>
      <Preview>{t('login.emailOtp.email.preview')}</Preview>
      <Heading className="leading-tight tracking-tight">{t('login.emailOtp.email.subject')}</Heading>

      <Text>{t('login.emailOtp.email.body')}</Text>

      <code className="border-border bg-muted inline-block rounded-md border border-solid px-5 py-3.5 font-mono text-2xl tracking-widest">
        {otp}
      </code>

      <Text className="text-muted-foreground">{t('login.emailOtp.email.disclaimer')}</Text>
    </Layout>
  )
}

SignInOtp.subject = async ({ locale }: CommonEmailProps) => {
  const { t } = await getTranslation({ locale, ns: 'auth' })
  return t('login.emailOtp.email.subject')
}

SignInOtp.PreviewProps = {
  otp: '123456',
  locale: 'en'
}

export default SignInOtp
