import { createFileRoute } from '@tanstack/react-router'

import { z } from 'zod'

import { useTranslation } from '@libs/i18n'
import { CustomersDataTable, PageHeader, PageHeaderDescription, PageHeaderTitle } from '@libs/studio'

const searchSchema = z.object({
  page: z.coerce.number().int().default(1).catch(1),
  perPage: z.coerce.number().int().default(10).catch(10),
  sort: z.string().optional().catch(undefined),
  q: z.string().optional().catch(undefined),
  provider: z.string().optional().catch(undefined),
  subscriptions: z.string().optional().catch(undefined),
  orders: z.string().optional().catch(undefined),
  createdAt: z.string().optional().catch(undefined)
})

export const Route = createFileRoute('/_app/admin/customers/')({
  validateSearch: searchSchema,
  component: CustomersPage
})

function CustomersPage() {
  const { t } = useTranslation('admin')

  return (
    <div className="flex w-full flex-col gap-8">
      <PageHeader>
        <div className="flex flex-col gap-1.5">
          <PageHeaderTitle>{t('customers.title')}</PageHeaderTitle>
          <PageHeaderDescription>{t('customers.description')}</PageHeaderDescription>
        </div>
      </PageHeader>

      <CustomersDataTable />
    </div>
  )
}
