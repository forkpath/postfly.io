import type { User } from '@libs/auth'

import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

import { useTranslation } from '@libs/i18n'
import { authClient, GoLink, pathsConfig } from '@libs/studio'
import { Icons } from '@libs/ui-shared/web'

export const Route = createFileRoute('/workspace')({
  ssr: false,
  beforeLoad: async ({ location }) => {
    // 检查登录状态
    const session = (await authClient.getSession()) as unknown as {
      session: unknown
      user: User | null
    } | null

    if (!session?.user) {
      throw redirect({
        to: pathsConfig.auth.login,
        search: { redirectTo: undefined, invitationId: undefined, email: undefined }
      })
    }

    // 获取用户所属的组织列表
    const { data: organizations } = await authClient.organization.list({})

    // 访问 /workspace 时重定向到 /workspace/select
    if (location.pathname === '/workspace') {
      throw redirect({
        to: pathsConfig.workspace.select
      })
    }

    return { user: session.user, organizations: organizations ?? [] }
  },
  component: WorkspaceLayout
})

function WorkspaceLayout() {
  const { t } = useTranslation('common')

  return (
    <main className="bg-muted/30 flex min-h-screen w-full flex-col items-center justify-center px-4">
      <header className="fixed top-0 left-0 p-6">
        <GoLink href={pathsConfig.index} className="flex shrink-0 items-center gap-3" aria-label={t('home')}>
          <Icons.Logo className="text-primary h-8" />
          <Icons.LogoText className="text-foreground h-4" />
        </GoLink>
      </header>
      <Outlet />
    </main>
  )
}
