import { createFileRoute } from '@tanstack/react-router'

import { useTranslation } from '@libs/i18n'
import {
  authClient,
  DeleteAccount,
  EditAvatar,
  EditName,
  LanguageSwitcher,
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle
} from '@libs/studio'

export const Route = createFileRoute('/_app/user/profile')({
  component: ProfilePage
})

function ProfilePage() {
  const { t } = useTranslation('auth')
  const session = authClient.useSession()
  const sessionData = session as unknown as {
    data?: {
      user?: {
        id: string
        name: string | null
        image: string | null
        email: string
      }
    }
  }
  const userData = sessionData.data?.user

  if (!userData) return null

  return (
    <div className="flex w-full flex-col gap-8">
      <PageHeader>
        <div className="flex flex-col gap-1.5">
          <PageHeaderTitle>{t('account.settings.header.title')}</PageHeaderTitle>
          <PageHeaderDescription>{t('account.settings.header.description')}</PageHeaderDescription>
        </div>
      </PageHeader>

      <div className="grid max-w-2xl gap-6">
        <EditAvatar
          user={{
            id: userData.id,
            name: userData.name,
            image: userData.image
          }}
        />
        <EditName
          user={{
            id: userData.id,
            name: userData.name ?? ''
          }}
        />
        <LanguageSwitcher />
        <DeleteAccount />
      </div>
    </div>
  )
}
