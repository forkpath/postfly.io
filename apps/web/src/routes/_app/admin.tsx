import type { User } from '@libs/auth'

import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

import { hasAdminPermission } from '@libs/auth'
import { useTranslation } from '@libs/i18n'
import { AdminSecondaryNav, pathsConfig, SecondaryNavProvider } from '@libs/studio'

// Admin 路由 - 需要管理员权限
export const Route = createFileRoute('/_app/admin')({
  beforeLoad: async ({ context }) => {
    const user = context.user as User
    if (!hasAdminPermission(user)) {
      throw redirect({ to: pathsConfig.user.settings.index })
    }
  },
  component: AdminRoute
})

function AdminRoute() {
  const { t } = useTranslation('common')

  return (
    <SecondaryNavProvider
      value={{
        title: t('admin'),
        // 大屏模式：简单的链接列表
        // 折叠/小屏模式的菜单项统一由 _app.tsx 的 menu.subItems 提供
        desktopContent: <AdminSecondaryNav />
      }}
    >
      <Outlet />
    </SecondaryNavProvider>
  )
}
