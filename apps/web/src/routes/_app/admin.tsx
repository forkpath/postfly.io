import type { User } from '@libs/auth'

import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

import { hasAdminPermission } from '@libs/auth'
import { pathsConfig } from '@libs/studio'

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
  return <Outlet />
}
