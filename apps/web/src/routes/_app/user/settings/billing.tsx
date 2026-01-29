import { createFileRoute } from '@tanstack/react-router'

import { useTranslation } from '@libs/i18n'
import { PageHeader, PageHeaderDescription, PageHeaderTitle } from '@libs/studio'

export const Route = createFileRoute('/_app/user/settings/billing')({
  component: BillingPage
})

function BillingPage() {
  const { t } = useTranslation('billing')

  return (
    <div className="flex w-full flex-col gap-8">
      <PageHeader>
        <div className="flex flex-col gap-1.5">
          <PageHeaderTitle>{t('title')}</PageHeaderTitle>
          <PageHeaderDescription>{t('description')}</PageHeaderDescription>
        </div>
      </PageHeader>

      <div className="text-muted-foreground">Billing settings - Coming Soon</div>
    </div>
  )
}
