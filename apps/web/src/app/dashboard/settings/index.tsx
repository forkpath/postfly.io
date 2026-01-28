import { createFileRoute } from '@tanstack/react-router'

import { useTranslation } from '@libs/i18n'
import { DashboardHeader, DashboardHeaderDescription, DashboardHeaderTitle } from '@libs/studio'

export const Route = createFileRoute('/dashboard/settings/')({
  component: SettingsPage
})

function SettingsPage() {
  const { t } = useTranslation('settings')

  return (
    <div className="flex w-full flex-col gap-8">
      <DashboardHeader>
        <div className="flex flex-col gap-1.5">
          <DashboardHeaderTitle>{t('general.title')}</DashboardHeaderTitle>
          <DashboardHeaderDescription>{t('general.description')}</DashboardHeaderDescription>
        </div>
      </DashboardHeader>

      <div className="text-muted-foreground">User settings - Coming Soon</div>
    </div>
  )
}
