import type { Preset } from 'envin/types'

import { defineEnv } from 'envin'
import * as z from 'zod'

import { sharedPreset } from '../../utils/env'

export const preset = {
  id: 'resend',
  server: {
    RESEND_API_KEY: z.string()
  },
  extends: [sharedPreset]
} as const satisfies Preset

export const env = defineEnv({
  ...preset
})
