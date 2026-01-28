import { createFileRoute } from '@tanstack/react-router'

import { useTranslation } from '@libs/i18n'
import { DashboardHeader, DashboardHeaderDescription, DashboardHeaderTitle } from '@libs/studio'

export const Route = createFileRoute('/dashboard/settings/security')({
  component: SecurityPage
})

function SecurityPage() {
  const { t } = useTranslation('settings')

  return (
    <div className="flex w-full flex-col gap-8">
      <DashboardHeader>
        <div className="flex flex-col gap-1.5">
          <DashboardHeaderTitle>{t('security.title')}</DashboardHeaderTitle>
          <DashboardHeaderDescription>{t('security.description')}</DashboardHeaderDescription>
        </div>
      </DashboardHeader>

      <div className="text-muted-foreground">Security settings - Coming Soon</div>
    </div>
  )
}
