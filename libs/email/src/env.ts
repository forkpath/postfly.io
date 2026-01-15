import type { Preset } from 'envin/types'

import { defineEnv } from 'envin'
import * as z from 'zod'

import { preset as providerPreset } from './providers/env'

export const preset = {
  id: 'email',
  server: {
    PRODUCT_NAME: z.string().optional()
  },
  extends: [providerPreset]
} as const satisfies Preset

export const env = defineEnv({
  ...preset
})
