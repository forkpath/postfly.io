import { authClient } from '~/lib/auth'
import { Redirect } from 'expo-router'

export default function IndexRoute() {
  const session = authClient.useSession()

  if (session.isPending) {
    return null
  }

  if (!session.data) {
    return <Redirect href="/welcome" />
  }

  return <Redirect href="/dashboard" />
}
