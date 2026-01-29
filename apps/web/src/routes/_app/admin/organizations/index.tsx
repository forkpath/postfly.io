import { createFileRoute } from '@tanstack/react-router'

import { useTranslation } from '@libs/i18n'
import { PageHeader, PageHeaderDescription, PageHeaderTitle } from '@libs/studio'

export const Route = createFileRoute('/_app/admin/organizations/')({
  component: OrganizationsPage
})

function OrganizationsPage() {
  const { t } = useTranslation('admin')

  return (
    <div className="flex w-full flex-col gap-8">
      <PageHeader>
        <div className="flex flex-col gap-1.5">
          <PageHeaderTitle>{t('organizations.title')}</PageHeaderTitle>
          <PageHeaderDescription>{t('organizations.description')}</PageHeaderDescription>
        </div>
      </PageHeader>

      <div className="text-muted-foreground">Organizations DataTable - Coming Soon</div>
    </div>
  )
}
