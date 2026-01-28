import { createFileRoute } from '@tanstack/react-router'

import { useTranslation } from '@libs/i18n'
import { DashboardHeader, DashboardHeaderDescription, DashboardHeaderTitle } from '@libs/studio'

export const Route = createFileRoute('/dashboard/$organization/')({
  component: OrganizationPage
})

function OrganizationPage() {
  const { organization } = Route.useParams()
  const { t } = useTranslation('organization')

  return (
    <div className="flex w-full flex-col gap-8">
      <DashboardHeader>
        <div className="flex flex-col gap-1.5">
          <DashboardHeaderTitle>{t('home.title')}</DashboardHeaderTitle>
          <DashboardHeaderDescription>{organization}</DashboardHeaderDescription>
        </div>
      </DashboardHeader>

      <div className="text-muted-foreground">Organization dashboard - Coming Soon</div>
    </div>
  )
}
