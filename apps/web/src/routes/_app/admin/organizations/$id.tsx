import { createFileRoute } from '@tanstack/react-router'

import { useTranslation } from '@libs/i18n'
import { MembersDataTable, OrganizationDetails, OrganizationHeader, OrgInvitationsDataTable } from '@libs/studio'

export const Route = createFileRoute('/_app/admin/organizations/$id')({
  component: OrganizationDetailPage
})

function OrganizationDetailPage() {
  const { id } = Route.useParams()
  const { t } = useTranslation('common')

  const sections = [
    { label: t('members'), component: <MembersDataTable orgId={id} /> },
    {
      label: t('invitations'),
      component: <OrgInvitationsDataTable orgId={id} />
    }
  ]

  return (
    <div className="flex w-full flex-col gap-8">
      <OrganizationHeader id={id} />
      <OrganizationDetails id={id} />
      <div className="mt-4 flex w-full flex-col gap-10">
        {sections.map(({ label, component }) => (
          <section key={label} className="flex w-full flex-col gap-4">
            <header>
              <h3 className="text-xl font-semibold tracking-tight">{label}</h3>
            </header>
            {component}
          </section>
        ))}
      </div>
    </div>
  )
}
