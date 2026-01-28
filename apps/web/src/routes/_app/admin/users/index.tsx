import { createFileRoute } from '@tanstack/react-router'

import { useTranslation } from '@libs/i18n'
import { DashboardHeader, DashboardHeaderDescription, DashboardHeaderTitle } from '@libs/studio'

export const Route = createFileRoute('/_app/admin/users/')({
  component: UsersPage
})

function UsersPage() {
  const { t } = useTranslation('admin')

  return (
    <div className="flex w-full flex-col gap-8">
      <DashboardHeader>
        <div className="flex flex-col gap-1.5">
          <DashboardHeaderTitle>{t('users.title')}</DashboardHeaderTitle>
          <DashboardHeaderDescription>{t('users.description')}</DashboardHeaderDescription>
        </div>
      </DashboardHeader>

      <div className="text-muted-foreground">Users DataTable - Coming Soon</div>
    </div>
  )
}
