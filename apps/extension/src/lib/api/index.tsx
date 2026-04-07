import { appConfig } from '~/config/app'

import { createClient } from '@libs/api-client'
import { Platform } from '@libs/common'

export const apiClient = createClient({
  baseURL: appConfig.url,
  headers: {
    'x-client-platform': Platform.EXTENSION
  }
})
