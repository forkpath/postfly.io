import { createFileRoute } from '@tanstack/react-router'

import { useTranslation } from '@libs/i18n'
import { PageHeader, PageHeaderDescription, PageHeaderTitle } from '@libs/studio'

export const Route = createFileRoute('/_app/user/settings/')({
  component: SettingsPage
})

function SettingsPage() {
  const { t } = useTranslation('settings')

  return (
    <div className="flex w-full flex-col gap-8">
      <PageHeader>
        <div className="flex flex-col gap-1.5">
          <PageHeaderTitle>{t('general.title')}</PageHeaderTitle>
          <PageHeaderDescription>{t('general.description')}</PageHeaderDescription>
        </div>
      </PageHeader>

      <div className="text-muted-foreground">User settings - Coming Soon</div>
    </div>
  )
}
