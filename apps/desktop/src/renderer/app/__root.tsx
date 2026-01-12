import type { QueryClient } from '@tanstack/react-query'

import { TanStackDevtools } from '@tanstack/react-devtools'
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools'
import { createRootRouteWithContext, Link, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  component: RootComponent,
  notFoundComponent: () => {
    return (
      <div>
        <p>This is the notFoundComponent configured on root route</p>
        <Link to="/">Start Over</Link>
      </div>
    )
  }
})

function RootComponent() {
  return (
    <>
      <div className="p-2 flex gap-2 text-lg">
        <Link
          to="/"
          activeProps={{
            className: 'font-bold'
          }}
          activeOptions={{ exact: true }}
        >
          Home
        </Link>{' '}
        <Link
          to="/posts"
          activeProps={{
            className: 'font-bold'
          }}
        >
          Posts
        </Link>{' '}
        <Link
          to="/route-a"
          activeProps={{
            className: 'font-bold'
          }}
        >
          Pathless Layout
        </Link>{' '}
        {/* <Link

          to="/this-route-does-not-exist"
          activeProps={{
            className: 'font-bold'
          }}
        >
          This Route Does Not Exist
        </Link> */}
      </div>
      <hr />
      <Outlet />
      <TanStackDevtools
        config={{
          position: 'bottom-right'
        }}
        plugins={[
          { name: 'TanStack Router', render: <TanStackRouterDevtoolsPanel /> },
          { name: 'TanStack Query', render: <ReactQueryDevtoolsPanel /> }
        ]}
      />
    </>
  )
}
