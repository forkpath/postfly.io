import { createFileRoute } from '@tanstack/react-router'

import { useTranslation } from '@libs/i18n'
import {
  AccountsDataTable,
  InvitationsDataTable,
  MembershipsDataTable,
  OrdersDataTable,
  SessionsList,
  SubscriptionsDataTable,
  UserDetails,
  UserHeader
} from '@libs/studio'

export const Route = createFileRoute('/_app/admin/users/$id')({
  component: UserDetailPage
})

function UserDetailPage() {
  const { id } = Route.useParams()
  const { t } = useTranslation('common')

  const sections = [
    { label: t('accounts'), component: <AccountsDataTable id={id} /> },
    {
      label: t('subscriptions'),
      component: <SubscriptionsDataTable userId={id} />
    },
    { label: t('orders'), component: <OrdersDataTable userId={id} /> },
    {
      label: t('memberships'),
      component: <MembershipsDataTable userId={id} />
    },
    {
      label: t('invitations'),
      component: <InvitationsDataTable userId={id} />
    }
  ]

  return (
    <div className="flex w-full flex-col gap-8">
      <UserHeader id={id} />
      <UserDetails id={id} />
      <div className="mt-4 flex w-full flex-col gap-10">
        {sections.map(({ label, component }) => (
          <section key={label} className="flex w-full flex-col gap-4">
            <header>
              <h3 className="text-xl font-semibold tracking-tight">{label}</h3>
            </header>
            {component}
          </section>
        ))}
        <SessionsList id={id} />
      </div>
    </div>
  )
}
