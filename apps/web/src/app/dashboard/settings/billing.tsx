import { createFileRoute } from '@tanstack/react-router'

import { useTranslation } from '@libs/i18n'
import { DashboardHeader, DashboardHeaderDescription, DashboardHeaderTitle } from '@libs/studio'

export const Route = createFileRoute('/dashboard/settings/billing')({
  component: BillingPage
})

function BillingPage() {
  const { t } = useTranslation('billing')

  return (
    <div className="flex w-full flex-col gap-8">
      <DashboardHeader>
        <div className="flex flex-col gap-1.5">
          <DashboardHeaderTitle>{t('title')}</DashboardHeaderTitle>
          <DashboardHeaderDescription>{t('description')}</DashboardHeaderDescription>
        </div>
      </DashboardHeader>

      <div className="text-muted-foreground">Billing settings - Coming Soon</div>
    </div>
  )
}
