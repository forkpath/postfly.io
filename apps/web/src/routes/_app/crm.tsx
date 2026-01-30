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

  // 移动端/折叠状态的菜单项（统一样式）
  const mobileItems = [
    {
      label: t('overview'),
      href: pathsConfig.crm.index,
      icon: <Icons.LayoutDashboard className="size-4" />
    },
    {
      label: t('ai'),
      href: pathsConfig.crm.ai,
      icon: <Icons.Brain className="size-4" />
    }
  ]

  return (
    <SecondaryNavProvider
      value={{
        title: t('home'),
        // 大屏模式：自定义的复杂布局组件
        desktopContent: <CrmSecondaryNav />,
        // 移动端/折叠模式：统一的菜单项
        mobileItems
      }}
    >
      <Outlet />
    </SecondaryNavProvider>
  )
}
