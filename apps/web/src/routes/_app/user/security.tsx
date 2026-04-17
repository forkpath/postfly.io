import { createFileRoute } from '@tanstack/react-router'

import { useTranslation } from '@libs/i18n'
import {
  Accounts,
  authClient,
  EditEmail,
  EditPassword,
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
  Passkeys,
  Sessions,
  TwoFactorAuthentication
} from '@libs/studio'

export const Route = createFileRoute('/_app/user/security')({
  component: SecurityPage
})

function SecurityPage() {
  const { t } = useTranslation('auth')
  const session = authClient.useSession()
  const sessionData = session as unknown as {
    data?: {
      user?: {
        email: string
        emailVerified: boolean
      }
    }
  }
  const userData = sessionData.data?.user

  if (!userData) return null

  return (
    <div className="flex w-full flex-col gap-8">
      <PageHeader>
        <div className="flex flex-col gap-1.5">
          <PageHeaderTitle>{t('account.settings.security.title')}</PageHeaderTitle>
          <PageHeaderDescription>{t('account.settings.security.description')}</PageHeaderDescription>
        </div>
      </PageHeader>

      <div className="grid max-w-2xl gap-6">
        <EditEmail
          user={{
            email: userData.email,
            emailVerified: userData.emailVerified
          }}
        />
        <EditPassword />
        <Accounts />
        <Passkeys />
        <TwoFactorAuthentication />
        <Sessions />
      </div>
    </div>
  )
}
