import { createFileRoute } from '@tanstack/react-router'

import { useTranslation } from '@libs/i18n'
import { DashboardHeader, DashboardHeaderDescription, DashboardHeaderTitle } from '@libs/studio'

export const Route = createFileRoute('/dashboard/ai')({
  component: AIPage
})

function AIPage() {
  const { t } = useTranslation('dashboard')

  return (
    <div className="flex w-full flex-col gap-8">
      <DashboardHeader>
        <div className="flex flex-col gap-1.5">
          <DashboardHeaderTitle>{t('ai.title')}</DashboardHeaderTitle>
          <DashboardHeaderDescription>{t('ai.description')}</DashboardHeaderDescription>
        </div>
      </DashboardHeader>

      <div className="text-muted-foreground">AI Demo - Coming Soon</div>
    </div>
  )
}
