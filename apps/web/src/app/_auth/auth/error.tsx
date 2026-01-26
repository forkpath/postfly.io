import { createFileRoute } from '@tanstack/react-router'

import { AuthErrorPage } from '@libs/studio'

export const Route = createFileRoute('/_auth/auth/error')({
  validateSearch: (search: Record<string, unknown>) => ({
    error: search.error as string | undefined
  }),
  component: ErrorRoute
})

function ErrorRoute() {
  const { error } = Route.useSearch()

  return <AuthErrorPage error={error} />
}
