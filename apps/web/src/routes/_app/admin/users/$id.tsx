import { createFileRoute } from '@tanstack/react-router'

import { useTranslation } from '@libs/i18n'
import { PageHeader, PageHeaderDescription, PageHeaderTitle } from '@libs/studio'

export const Route = createFileRoute('/_app/admin/users/$id')({
  component: UserDetailPage
})

function UserDetailPage() {
  const { id } = Route.useParams()
  const { t } = useTranslation('admin')

  return (
    <div className="flex w-full flex-col gap-8">
      <PageHeader>
        <div className="flex flex-col gap-1.5">
          <PageHeaderTitle>{t('users.detail.title')}</PageHeaderTitle>
          <PageHeaderDescription>ID: {id}</PageHeaderDescription>
        </div>
      </PageHeader>

      <div className="text-muted-foreground">User details - Coming Soon</div>
    </div>
  )
}
