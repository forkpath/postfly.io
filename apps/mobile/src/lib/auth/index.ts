import { getBaseUrl } from '~/lib/api'
import { useI18nConfig } from '~/lib/providers/i18n'
import * as Linking from 'expo-linking'
import * as SecureStore from 'expo-secure-store'

import { createClient } from '@libs/auth/client/mobile'
import { Platform } from '@libs/common'
import { config as i18nConfig } from '@libs/i18n'

export const authClient = createClient({
  baseURL: getBaseUrl(),
  fetchOptions: {
    headers: {
      'x-client-platform': Platform.MOBILE,
      origin: Linking.createURL('')
    },
    throw: true,
    onRequest: ctx => {
      const locale = `${i18nConfig.cookie}=${useI18nConfig.getState().config.locale}`
      if (ctx.headers instanceof Headers) {
        const cookie = ctx.headers.get('cookie')
        ctx.headers.set('cookie', `${locale}${cookie ? `; ${cookie}` : ''}`)
      }
      return ctx
    }
  },
  mobile: {
    storage: SecureStore,
    cookiePrefix: 'ray-mobile'
  },
  lastLoginMethod: {
    storage: SecureStore
  }
})
