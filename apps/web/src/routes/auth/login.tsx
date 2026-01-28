import { createFileRoute } from '@tanstack/react-router'

import { LoginFlow } from '@libs/studio'

export const Route = createFileRoute('/auth/login')({
  validateSearch: (search: Record<string, unknown>) => ({
    redirectTo: search.redirectTo as string | undefined,
    invitationId: search.invitationId as string | undefined,
    email: search.email as string | undefined
  }),
  component: LoginPage
})

function LoginPage() {
  const { redirectTo, invitationId, email } = Route.useSearch()

  return <LoginFlow redirectTo={redirectTo} invitationId={invitationId} email={email} />
}
