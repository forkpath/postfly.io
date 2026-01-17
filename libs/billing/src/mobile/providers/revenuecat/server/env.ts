import type { Preset } from 'envin/types'

import { defineEnv } from 'envin'
import * as z from 'zod'

import { envConfig } from '@libs/common/constants'

export const preset = {
  id: 'revenuecat',
  server: {
    REVENUECAT_API_KEY: z.string(),
    REVENUECAT_WEBHOOK_SECRET: z.string()
  }
} as const satisfies Preset

export const env = defineEnv({
  ...envConfig,
  ...preset
})
