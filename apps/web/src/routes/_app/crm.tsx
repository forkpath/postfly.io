import { createFileRoute, Outlet } from '@tanstack/react-router'

import { useTranslation } from '@libs/i18n'
import { CrmSecondaryNav, pathsConfig, SecondaryNavProvider } from '@libs/studio'
import { Icons } from '@libs/ui-shared/web'

// CRM 路由 Layout - 提供二级导航
export const Route = createFileRoute('/_app/crm')({
  component: CrmLayout
})

function CrmLayout() {
  const { t } = useTranslation('common')

  return (
    <SecondaryNavProvider
      value={{
        title: t('home'),
        // 大屏模式：自定义的复杂布局组件
        // 折叠/小屏模式的菜单项统一由 _app.tsx 的 menu.subItems 提供
        desktopContent: <CrmSecondaryNav />
      }}
    >
      <Outlet />
    </SecondaryNavProvider>
  )
}
