import { createFileRoute } from '@tanstack/react-router'

import { useTranslation } from '@libs/i18n'
import { DashboardHeader, DashboardHeaderDescription, DashboardHeaderTitle, OrganizationPicker } from '@libs/studio'

export const Route = createFileRoute('/_app/crm/')({
  component: DashboardPage
})

function DashboardPage() {
  const { t } = useTranslation('dashboard')

  return (
    <div className="flex w-full flex-col gap-8">
      <DashboardHeader>
        <div className="flex flex-col gap-1.5">
          <DashboardHeaderTitle>{t('home.title')}</DashboardHeaderTitle>
          <DashboardHeaderDescription>{t('home.description')}</DashboardHeaderDescription>
        </div>
      </DashboardHeader>

      <OrganizationPicker />
    </div>
  )
}
