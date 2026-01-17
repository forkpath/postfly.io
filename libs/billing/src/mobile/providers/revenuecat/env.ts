/* eslint-disable turbo/no-undeclared-env-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { Preset } from 'envin/types'

import { defineEnv } from 'envin'
import * as z from 'zod'

import { envConfig } from '@libs/common/constants'

export const preset = {
  id: 'revenuecat',
  clientPrefix: 'EXPO_PUBLIC_',
  client: {
    EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY: z.string(),
    EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY: z.string()
  }
} as const satisfies Preset

export const env = defineEnv({
  ...envConfig,
  ...preset,
  env: {
    EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY: process.env.EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY,
    EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY: process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY
  }
})
