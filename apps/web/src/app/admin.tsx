import type { User } from '@libs/auth'
import type { Menu } from '@libs/studio'

import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

import { hasAdminPermission } from '@libs/auth'
import { authClient, DashboardActionBar, DashboardInset, DashboardSidebar, GoLink, pathsConfig } from '@libs/studio'
import { Icons, SidebarInset, SidebarProvider } from '@libs/ui-shared/web'

// Admin 布局采用 SPA 模式，需要管理员权限
export const Route = createFileRoute('/admin')({
  ssr: false,
  beforeLoad: async () => {
    // 客户端认证和权限检查
    // authClient.getSession() 运行时返回: null | { session, user }
    // TypeScript 类型与运行时不一致，需要类型断言
    const session = (await authClient.getSession()) as unknown as { session: unknown; user: User | null } | null
    if (!session?.user) {
      throw redirect({
        to: pathsConfig.auth.login,
        search: { redirectTo: undefined, invitationId: undefined, email: undefined }
      })
    }
    if (!hasAdminPermission(session.user)) {
      throw redirect({ to: pathsConfig.dashboard.user.index })
    }
    return { user: session.user }
  },
  component: AdminLayout
})

function AdminLayout() {
  const { user } = Route.useRouteContext()
  const { data: session } = authClient.useSession()

  const currentUser = (session?.user ?? user) as User

  const menu: Menu = [
    {
      label: 'admin',
      items: [
        {
          title: 'home',
          href: pathsConfig.admin.index,
          icon: <Icons.Home />
        },
        {
          title: 'users',
          href: pathsConfig.admin.users.index,
          exact: false,
          icon: <Icons.UsersRound />
        },
        {
          title: 'organizations',
          href: pathsConfig.admin.organizations.index,
          exact: false,
          icon: <Icons.Building />
        },
        {
          title: 'customers',
          href: pathsConfig.admin.customers.index,
          exact: false,
          icon: <Icons.HandCoins />
        }
      ]
    }
  ]

  return (
    <SidebarProvider>
      <DashboardSidebar
        user={currentUser}
        menu={menu}
        header={
          <GoLink
            href={pathsConfig.index}
            className="flex items-center gap-3 p-2 transition-[padding] group-data-[collapsible=icon]:p-0.5"
          >
            <Icons.Logo className="text-primary h-8 transition-[width,height]" />
            <Icons.LogoText className="text-foreground h-4 group-data-[collapsible=icon]:hidden" />
          </GoLink>
        }
      />
      <SidebarInset>
        <DashboardActionBar menu={menu} />
        <DashboardInset>
          <Outlet />
        </DashboardInset>
      </SidebarInset>
    </SidebarProvider>
  )
}
