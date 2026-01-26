import { useTranslation } from '@libs/i18n'

import { ForgotPasswordForm } from './form/password/forgot'
import { AuthHeader } from './layout/header'

export const ForgotPasswordPage = () => {
  const { t } = useTranslation('auth')
  return (
    <>
      <AuthHeader
        title={t('account.password.forgot.header.title')}
        description={t('account.password.forgot.header.description')}
      />
      <ForgotPasswordForm />
    </>
  )
}
