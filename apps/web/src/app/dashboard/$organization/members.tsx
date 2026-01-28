import { createFileRoute } from '@tanstack/react-router'

import { useTranslation } from '@libs/i18n'
import { DashboardHeader, DashboardHeaderDescription, DashboardHeaderTitle } from '@libs/studio'

export const Route = createFileRoute('/dashboard/$organization/members')({
  component: MembersPage
})

function MembersPage() {
  const { t } = useTranslation('organization')

  return (
    <div className="flex w-full flex-col gap-8">
      <DashboardHeader>
        <div className="flex flex-col gap-1.5">
          <DashboardHeaderTitle>{t('members.title')}</DashboardHeaderTitle>
          <DashboardHeaderDescription>{t('members.description')}</DashboardHeaderDescription>
        </div>
      </DashboardHeader>

      <div className="text-muted-foreground">Members management - Coming Soon</div>
    </div>
  )
}
