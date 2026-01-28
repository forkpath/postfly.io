import { createFileRoute, redirect } from '@tanstack/react-router'

import { authClient, pathsConfig } from '@libs/studio'

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    // 检查用户是否已登录
    // authClient.getSession() 运行时返回: null | { session, user }
    // TypeScript 类型与运行时不一致，需要类型断言
    const session = (await authClient.getSession()) as unknown as {
      session: unknown
      user: { id: string } | null
    } | null

    if (!session?.user) {
      // 未登录，重定向到登录页面
      throw redirect({
        to: pathsConfig.auth.login,
        search: {
          redirectTo: '/',
          invitationId: undefined,
          email: undefined
        }
      })
    }
  },
  component: Home
})

function Home() {
  const { data: session } = authClient.useSession()

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-6 p-4">
      <h1 className="text-3xl font-bold">Ray Desktop</h1>
      <p className="text-muted-foreground">Welcome, {session?.user?.name ?? session?.user?.email ?? 'User'}!</p>
    </div>
  )
}
