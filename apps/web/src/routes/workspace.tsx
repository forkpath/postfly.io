import type { User } from '@libs/auth'

import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

import { useTranslation } from '@libs/i18n'
import { authClient, GoLink, pathsConfig } from '@libs/studio'
import { Icons, Skeleton } from '@libs/ui-shared/web'

export const Route = createFileRoute('/workspace')({
  ssr: false,
  pendingMs: 0,
  pendingComponent: WorkspacePending,
  beforeLoad: async ({ location }) => {
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

    if (location.pathname === '/workspace') {
      throw redirect({
        to: pathsConfig.workspace.select
      })
    }

    return { user: session.user }
  },
  component: WorkspaceLayout
})

/**
 * beforeLoad 执行期间立即展示的骨架屏，
 * 布局与最终 WorkspaceLayout + WorkspaceSelector 保持一致，
 * 避免导航时显示旧页面造成视觉混乱
 */
function WorkspacePending() {
  return (
    <main className="bg-muted/30 flex min-h-screen w-full flex-col items-center justify-center px-4">
      <header className="fixed top-0 left-0 p-6">
        <div className="flex shrink-0 items-center gap-3">
          <Icons.Logo className="text-primary h-8" />
          <Icons.LogoText className="text-foreground h-4" />
        </div>
      </header>
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center space-y-2 text-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <nav className="space-y-3">
          <Skeleton className="h-[76px] rounded-md" />
          <Skeleton className="h-[76px] rounded-md" />
        </nav>
      </div>
    </main>
  )
}

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
