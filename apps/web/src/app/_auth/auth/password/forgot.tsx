import { createFileRoute } from '@tanstack/react-router'

import { ForgotPasswordPage } from '@libs/studio'

export const Route = createFileRoute('/_auth/auth/password/forgot')({
  component: ForgotPasswordRoute
})

function ForgotPasswordRoute() {
  return <ForgotPasswordPage />
}
