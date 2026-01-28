import { createFileRoute } from '@tanstack/react-router'

import { RegisterPage } from '@libs/studio'

export const Route = createFileRoute('/auth/register')({
  validateSearch: (search: Record<string, unknown>) => ({
    redirectTo: search.redirectTo as string | undefined,
    invitationId: search.invitationId as string | undefined,
    email: search.email as string | undefined
  }),
  component: RegisterRoute
})

function RegisterRoute() {
  const { redirectTo, invitationId, email } = Route.useSearch()

  return <RegisterPage redirectTo={redirectTo} invitationId={invitationId} email={email} />
}
