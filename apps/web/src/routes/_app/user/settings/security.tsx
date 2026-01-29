import { createFileRoute } from '@tanstack/react-router'

import { useTranslation } from '@libs/i18n'
import { PageHeader, PageHeaderDescription, PageHeaderTitle } from '@libs/studio'

export const Route = createFileRoute('/_app/user/settings/security')({
  component: SecurityPage
})

function SecurityPage() {
  const { t } = useTranslation('settings')

  return (
    <div className="flex w-full flex-col gap-8">
      <PageHeader>
        <div className="flex flex-col gap-1.5">
          <PageHeaderTitle>{t('security.title')}</PageHeaderTitle>
          <PageHeaderDescription>{t('security.description')}</PageHeaderDescription>
        </div>
      </PageHeader>

      <div className="text-muted-foreground">Security settings - Coming Soon</div>
    </div>
  )
}
