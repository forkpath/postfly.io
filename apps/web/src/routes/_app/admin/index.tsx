import { createFileRoute, redirect } from '@tanstack/react-router'

import { pathsConfig } from '@libs/studio'

const LAST_ADMIN_ROUTE_KEY = 'lastAdminRoute'

export const Route = createFileRoute('/_app/admin/')({
  beforeLoad: () => {
    if (typeof window !== 'undefined') {
      const lastRoute = localStorage.getItem(LAST_ADMIN_ROUTE_KEY)
      if (lastRoute) {
        throw redirect({ to: lastRoute })
      }
    }
    throw redirect({ to: pathsConfig.admin.organizations.index })
  }
})
