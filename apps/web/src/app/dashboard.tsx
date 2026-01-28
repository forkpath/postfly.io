import type { User } from '@libs/auth'
import type { Menu } from '@libs/studio'

import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

import { authClient, DashboardActionBar, DashboardInset, DashboardSidebar, GoLink, pathsConfig } from '@libs/studio'
import { Icons, SidebarInset, SidebarProvider } from '@libs/ui-shared/web'

// Dashboard 布局采用 SPA 模式
export const Route = createFileRoute('/dashboard')({
  ssr: false,
  beforeLoad: async () => {
    // 客户端认证检查
    // authClient.getSession() 运行时返回: null | { session, user }
    // TypeScript 类型与运行时不一致，需要类型断言
    const session = (await authClient.getSession()) as unknown as { session: unknown; user: User | null } | null
    if (!session?.user) {
      throw redirect({
        to: pathsConfig.auth.login,
        search: { redirectTo: undefined, invitationId: undefined, email: undefined }
      })
    }
    return { user: session.user }
  },
  component: DashboardLayout
})

function DashboardLayout() {
  const { user } = Route.useRouteContext()
  const { data: session } = authClient.useSession()

  const currentUser = (session?.user ?? user) as User

  const menu: Menu = [
    {
      label: 'platform',
      items: [
        {
          title: 'home',
          href: pathsConfig.dashboard.user.index,
          icon: <Icons.Home />
        },
        {
          title: 'ai',
          href: pathsConfig.dashboard.user.ai,
          icon: <Icons.Brain />
        }
      ]
    },
    {
      label: 'account',
      items: [
        {
          title: 'settings',
          href: pathsConfig.dashboard.user.settings.index,
          exact: false,
          icon: <Icons.Settings />,
          menu: [
            {
              items: [
                {
                  title: 'general',
                  href: pathsConfig.dashboard.user.settings.index,
                  icon: <Icons.Settings2 />
                },
                {
                  title: 'security',
                  href: pathsConfig.dashboard.user.settings.security,
                  icon: <Icons.Lock />
                },
                {
                  title: 'billing',
                  href: pathsConfig.dashboard.user.settings.billing,
                  icon: <Icons.CreditCard />
                }
              ]
            }
          ]
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
