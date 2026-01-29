import { createFileRoute } from '@tanstack/react-router'

import { useTranslation } from '@libs/i18n'
import { PageHeader, PageHeaderDescription, PageHeaderTitle } from '@libs/studio'

export const Route = createFileRoute('/_app/admin/users/')({
  component: UsersPage
})

function UsersPage() {
  const { t } = useTranslation('admin')

  return (
    <div className="flex w-full flex-col gap-8">
      <PageHeader>
        <div className="flex flex-col gap-1.5">
          <PageHeaderTitle>{t('users.title')}</PageHeaderTitle>
          <PageHeaderDescription>{t('users.description')}</PageHeaderDescription>
        </div>
      </PageHeader>

      <div className="text-muted-foreground">Users DataTable - Coming Soon</div>
    </div>
  )
}
