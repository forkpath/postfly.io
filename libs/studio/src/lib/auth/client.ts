import { createClient } from '@libs/auth/client/web'
import { ExecutionSide, Platform } from '@libs/common'

export const authClient = createClient({
  fetchOptions: {
    headers: {
      'x-client-platform': `${Platform.WEB}-${ExecutionSide.CLIENT}`
    },
    throw: true
  }
})
