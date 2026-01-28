import { createFileRoute } from '@tanstack/react-router'

import { UpdatePasswordPage } from '@libs/studio'

export const Route = createFileRoute('/auth/password/update')({
  validateSearch: (search: Record<string, unknown>) => ({
    token: search.token as string | undefined
  }),
  component: UpdatePasswordRoute
})

function UpdatePasswordRoute() {
  const { token } = Route.useSearch()

  return <UpdatePasswordPage token={token} />
}
