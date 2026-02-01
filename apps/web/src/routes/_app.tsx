import type { User } from '@libs/auth'
import type { AppShellMenuItem } from '@libs/studio'

import { useEffect } from 'react'
import { createFileRoute, Outlet, redirect, useNavigate } from '@tanstack/react-router'

import { hasAdminPermission, hasOrgAdminPermission, MemberRole } from '@libs/auth'
import { AppShell, authClient, pathsConfig, useWorkspaceStore } from '@libs/studio'
import { Icons } from '@libs/ui-shared/web'

// 应用内页共享布局 - pathless route (不添加到 URL)
// 采用 SPA 模式，需要认证
export const Route = createFileRoute('/_app')({
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

    // 获取用户所属的组织列表
    const { data: organizations } = await authClient.organization.list({})

    // 如果用户有组织成员身份，检查是否已选择工作空间
    if (organizations && organizations.length > 0) {
      // 使用 zustand store 来追踪用户是否已选择过工作空间
      // 通过 getState() 在非 React 上下文中访问 store 状态
      const { hasSelected } = useWorkspaceStore.getState()

      if (!hasSelected) {
        throw redirect({
          to: pathsConfig.workspace.select
        })
      }
    }

    return { user: session.user, organizations: organizations ?? [] }
  },
  component: AppLayout
})

function AppLayout() {
  const navigate = useNavigate()
  // beforeLoad 返回的静态用户数据，确保首次渲染时可用
  const { user } = Route.useRouteContext()
  // 响应式 session，当用户信息变化时自动更新
  const { data: session } = authClient.useSession()
  // 当前活跃组织信息
  // const { data: activeOrg } = authClient.useActiveOrganization()
  // 当前用户在活跃组织中的成员信息（包含角色）
  const { data: activeMember } = authClient.useActiveMember()

  // 优先使用实时 session 数据，回退到 beforeLoad 的初始数据
  const currentUser = (session?.user ?? user) as User
  // 全局管理员权限（user.role）
  const isAdmin = hasAdminPermission(currentUser)
  // 当前活跃组织的管理权限（member.role 为 admin 或 owner）
  const isOrgAdminOrOwner = hasOrgAdminPermission(activeMember?.role as MemberRole)

  // 根据用户权限构建一级菜单
  // 二级导航由各自的 layout route 通过 SecondaryNavProvider 提供
  const menu: AppShellMenuItem[] = [
    ...(isOrgAdminOrOwner
      ? [
          {
            label: 'home',
            href: pathsConfig.crm.index,
            icon: <Icons.Home className="size-6" />
          }
        ]
      : []),
    // 管理员菜单
    ...(isAdmin
      ? [
          {
            label: 'admin',
            href: pathsConfig.admin.index,
            icon: <Icons.Shield className="size-6" />
          }
        ]
      : [])
  ]

  useEffect(() => {
    if (session === null) {
      navigate({
        to: pathsConfig.auth.login,
        search: { redirectTo: undefined, invitationId: undefined, email: undefined }
      })
    }
  }, [navigate, session])

  return (
    <AppShell user={currentUser} menu={menu}>
      <Outlet />
    </AppShell>
  )
}
