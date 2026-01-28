import type { QueryClient } from '@tanstack/react-query'

import { TanStackDevtools } from '@tanstack/react-devtools'
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools'
import { createRootRouteWithContext, Link, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'

import { ThemeProvider, Toaster } from '@libs/studio'
import { cn } from '@libs/ui-shared/common'

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  component: RootComponent,
  notFoundComponent: () => {
    return (
      <div className="flex h-screen flex-col items-center justify-center">
        <p className="text-lg">Page Not Found</p>
        <Link to="/" className="text-primary mt-4 underline">
          Go Home
        </Link>
      </div>
    )
  }
})

function RootComponent() {
  return (
    <ThemeProvider>
      <div className={cn('bg-background text-foreground flex min-h-screen flex-col font-sans antialiased')}>
        <Outlet />
        <Toaster />
      </div>
      <TanStackDevtools
        config={{
          position: 'bottom-right'
        }}
        plugins={[
          { name: 'TanStack Router', render: <TanStackRouterDevtoolsPanel /> },
          { name: 'TanStack Query', render: <ReactQueryDevtoolsPanel /> }
        ]}
      />
    </ThemeProvider>
  )
}
