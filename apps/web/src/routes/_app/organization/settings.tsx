import { createFileRoute } from '@tanstack/react-router'

import { useTranslation } from '@libs/i18n'
import { DashboardHeader, DashboardHeaderDescription, DashboardHeaderTitle } from '@libs/studio'

export const Route = createFileRoute('/_app/organization/settings')({
  component: OrganizationSettingsPage
})

function OrganizationSettingsPage() {
  const { t } = useTranslation('organization')

  return (
    <div className="flex w-full flex-col gap-8">
      <DashboardHeader>
        <div className="flex flex-col gap-1.5">
          <DashboardHeaderTitle>{t('settings.title')}</DashboardHeaderTitle>
          <DashboardHeaderDescription>{t('settings.description')}</DashboardHeaderDescription>
        </div>
      </DashboardHeader>

      <div className="text-muted-foreground">Organization settings - Coming Soon</div>
    </div>
  )
}
