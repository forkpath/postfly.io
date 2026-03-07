import * as Linking from 'expo-linking'
import * as SecureStore from 'expo-secure-store'

import { createClient } from '@libs/auth/client/mobile'

import { mobileEnv } from './env'

export const authClient = createClient({
  baseURL: mobileEnv.apiBaseUrl,
  mobile: {
    storage: SecureStore,
    cookiePrefix: 'ray-mobile'
  },
  lastLoginMethod: {
    storage: SecureStore
  },
  fetchOptions: {
    headers: {
      origin: Linking.createURL('/')
    },
    throw: true
  }
})
