import { createFileRoute } from '@tanstack/react-router'

import { useTranslation } from '@libs/i18n'
import { DashboardHeader, DashboardHeaderDescription, DashboardHeaderTitle } from '@libs/studio'

export const Route = createFileRoute('/admin/organizations/$slug')({
  component: OrganizationDetailPage
})

function OrganizationDetailPage() {
  const { slug } = Route.useParams()
  const { t } = useTranslation('admin')

  return (
    <div className="flex w-full flex-col gap-8">
      <DashboardHeader>
        <div className="flex flex-col gap-1.5">
          <DashboardHeaderTitle>{t('organizations.detail.title')}</DashboardHeaderTitle>
          <DashboardHeaderDescription>Slug: {slug}</DashboardHeaderDescription>
        </div>
      </DashboardHeader>

      <div className="text-muted-foreground">Organization details - Coming Soon</div>
    </div>
  )
}
