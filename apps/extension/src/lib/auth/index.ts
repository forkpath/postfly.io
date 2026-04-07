import { appConfig } from '~/config/app'

import { createClient } from '@libs/auth/client/web'
import { Platform } from '@libs/common'

export const authClient = createClient({
  baseURL: appConfig.url,
  fetchOptions: {
    credentials: 'include',
    headers: {
      'x-client-platform': Platform.EXTENSION
    },
    throw: true
  }
})
