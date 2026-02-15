import type { User } from '@libs/auth'

import { useMemo } from 'react'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

import { hasAdminPermission } from '@libs/auth'
import { useTranslation } from '@libs/i18n'
import { getAdminNavConfig, pathsConfig, SecondaryNavProvider } from '@libs/studio'

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

  // 使用统一的导航配置（数据源唯一）
  const navConfig = useMemo(() => getAdminNavConfig(t as Parameters<typeof getAdminNavConfig>[0]), [t])

  return (
    // 配置式 SecondaryNavProvider：自动生成 desktopContent 和 mobileItems
    <SecondaryNavProvider config={navConfig}>
      <Outlet />
    </SecondaryNavProvider>
  )
}
