import { QueryClientProvider } from '@tanstack/react-query'
import { createRouter } from '@tanstack/react-router'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'

import { toast } from 'sonner'

import { getErrorMessage, getQueryClient } from '@libs/api-client'

import { DefaultCatchBoundary } from './components/default-catch-boundary'
import { NotFound } from './components/not-found'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const queryClient = getQueryClient({
    onQueryError: (error, { query }) => {
      if (query.meta?.suppressError) return
      toast.error(getErrorMessage(error))
    },
    onMutationError: error => {
      toast.error(getErrorMessage(error))
    }
  })

  const router = createRouter({
    routeTree,
    context: { queryClient },
    // defaultPreload: 'intent',
    defaultErrorComponent: DefaultCatchBoundary,
    scrollRestoration: true,
    defaultNotFoundComponent: () => <NotFound />,
    Wrap: (props: { children: React.ReactNode }) => {
      return <QueryClientProvider client={queryClient}>{props.children}</QueryClientProvider>
    }
  })
  setupRouterSsrQueryIntegration({
    router,
    queryClient
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
