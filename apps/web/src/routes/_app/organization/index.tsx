import { createFileRoute } from '@tanstack/react-router'

import { useTranslation } from '@libs/i18n'
import { PageHeader, PageHeaderDescription, PageHeaderTitle } from '@libs/studio'

export const Route = createFileRoute('/_app/organization/')({
  component: OrganizationPage
})

function OrganizationPage() {
  const { organization } = Route.useParams()
  const { t } = useTranslation('organization')

  return (
    <div className="flex w-full flex-col gap-8">
      <PageHeader>
        <div className="flex flex-col gap-1.5">
          <PageHeaderTitle>{t('home.title')}</PageHeaderTitle>
          <PageHeaderDescription>{organization}</PageHeaderDescription>
        </div>
      </PageHeader>

      <div className="text-muted-foreground">Organization dashboard - Coming Soon</div>
    </div>
  )
}
