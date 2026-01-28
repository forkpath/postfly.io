import { createFileRoute } from '@tanstack/react-router'

import { useTranslation } from '@libs/i18n'
import { DashboardHeader, DashboardHeaderDescription, DashboardHeaderTitle } from '@libs/studio'

export const Route = createFileRoute('/_app/admin/customers/')({
  component: CustomersPage
})

function CustomersPage() {
  const { t } = useTranslation('admin')

  return (
    <div className="flex w-full flex-col gap-8">
      <DashboardHeader>
        <div className="flex flex-col gap-1.5">
          <DashboardHeaderTitle>{t('customers.title')}</DashboardHeaderTitle>
          <DashboardHeaderDescription>{t('customers.description')}</DashboardHeaderDescription>
        </div>
      </DashboardHeader>

      <div className="text-muted-foreground">Customers DataTable - Coming Soon</div>
    </div>
  )
}
