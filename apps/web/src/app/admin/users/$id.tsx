import { createFileRoute } from '@tanstack/react-router'

import { useTranslation } from '@libs/i18n'
import { DashboardHeader, DashboardHeaderDescription, DashboardHeaderTitle } from '@libs/studio'

export const Route = createFileRoute('/admin/users/$id')({
  component: UserDetailPage
})

function UserDetailPage() {
  const { id } = Route.useParams()
  const { t } = useTranslation('admin')

  return (
    <div className="flex w-full flex-col gap-8">
      <DashboardHeader>
        <div className="flex flex-col gap-1.5">
          <DashboardHeaderTitle>{t('users.detail.title')}</DashboardHeaderTitle>
          <DashboardHeaderDescription>ID: {id}</DashboardHeaderDescription>
        </div>
      </DashboardHeader>

      <div className="text-muted-foreground">User details - Coming Soon</div>
    </div>
  )
}
