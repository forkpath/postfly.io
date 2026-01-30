import type { User } from '@libs/auth'

import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

import { hasAdminPermission } from '@libs/auth'
import { useTranslation } from '@libs/i18n'
import { AdminSecondaryNav, pathsConfig, SecondaryNavProvider } from '@libs/studio'
import { Icons } from '@libs/ui-shared/web'

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

  // 移动端/折叠状态的菜单项
  const mobileItems = [
    {
      label: t('users'),
      href: pathsConfig.admin.users.index,
      icon: <Icons.UsersRound className="size-4" />
    },
    {
      label: t('organizations'),
      href: pathsConfig.admin.organizations.index,
      icon: <Icons.Building className="size-4" />
    },
    {
      label: t('customers'),
      href: pathsConfig.admin.customers.index,
      icon: <Icons.HandCoins className="size-4" />
    }
  ]

  return (
    <SecondaryNavProvider
      value={{
        title: t('admin'),
        // 大屏模式：简单的链接列表
        desktopContent: <AdminSecondaryNav />,
        // 移动端/折叠模式：统一的菜单项
        mobileItems
      }}
    >
      <Outlet />
    </SecondaryNavProvider>
  )
}
