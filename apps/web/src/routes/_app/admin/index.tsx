import { createFileRoute } from '@tanstack/react-router'

import { useTranslation } from '@libs/i18n'
import { PageHeader, PageHeaderDescription, PageHeaderTitle } from '@libs/studio'
import { Card, CardContent, CardHeader, CardTitle, Icons } from '@libs/ui-shared/web'

export const Route = createFileRoute('/_app/admin/')({
  component: AdminHomePage
})

function AdminHomePage() {
  const { t } = useTranslation('admin')

  const stats = [
    { title: t('stats.users'), value: '0', icon: Icons.UsersRound },
    { title: t('stats.organizations'), value: '0', icon: Icons.Building },
    { title: t('stats.customers'), value: '0', icon: Icons.HandCoins }
  ]

  return (
    <div className="flex w-full flex-col gap-8">
      <PageHeader>
        <div className="flex flex-col gap-1.5">
          <PageHeaderTitle>{t('home.title')}</PageHeaderTitle>
          <PageHeaderDescription>{t('home.description')}</PageHeaderDescription>
        </div>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map(stat => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="text-muted-foreground size-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
