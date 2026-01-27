import { createFileRoute } from '@tanstack/react-router'

import { JoinPage } from '@libs/studio'

export const Route = createFileRoute('/_auth/auth/join')({
  validateSearch: (search: Record<string, unknown>) => ({
    redirectTo: search.redirectTo as string | undefined,
    invitationId: search.invitationId as string | undefined,
    email: search.email as string | undefined
  }),
  component: JoinRoute
})

function JoinRoute() {
  const { redirectTo, invitationId, email } = Route.useSearch()

  return <JoinPage redirectTo={redirectTo} invitationId={invitationId} email={email} />
}
