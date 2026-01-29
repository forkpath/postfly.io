import { createFileRoute } from '@tanstack/react-router'

import { useTranslation } from '@libs/i18n'
import { PageHeader, PageHeaderDescription, PageHeaderTitle } from '@libs/studio'

export const Route = createFileRoute('/_app/admin/organizations/$slug')({
  component: OrganizationDetailPage
})

function OrganizationDetailPage() {
  const { slug } = Route.useParams()
  const { t } = useTranslation('admin')

  return (
    <div className="flex w-full flex-col gap-8">
      <PageHeader>
        <div className="flex flex-col gap-1.5">
          <PageHeaderTitle>{t('organizations.detail.title')}</PageHeaderTitle>
          <PageHeaderDescription>Slug: {slug}</PageHeaderDescription>
        </div>
      </PageHeader>

      <div className="text-muted-foreground">Organization details - Coming Soon</div>
    </div>
  )
}
