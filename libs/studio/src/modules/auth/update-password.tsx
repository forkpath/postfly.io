import { useTranslation } from '@libs/i18n'

import { UpdatePasswordForm } from './form/password/update'
import { AuthHeader } from './layout/header'

interface UpdatePasswordPageProps {
  readonly token?: string
}

export const UpdatePasswordPage = ({ token }: UpdatePasswordPageProps) => {
  const { t } = useTranslation('auth')
  return (
    <>
      <AuthHeader
        title={t('account.password.update.header.title')}
        description={t('account.password.update.header.description')}
      />
      <UpdatePasswordForm token={token} />
    </>
  )
}
