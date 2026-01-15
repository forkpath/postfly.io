import type { Preset } from 'envin/types'

import { defineEnv } from 'envin'
import * as z from 'zod'

import { sharedPreset } from '../../utils/env'

export const preset = {
  id: 'aws-ses',
  server: {
    AWS_SES_ACCESS_KEY_ID: z.string(),
    AWS_SES_ACCESS_KEY_SECRET: z.string(),
    AWS_SES_REGION: z.string()
  },
  extends: [sharedPreset]
} as const satisfies Preset

export const env = defineEnv({
  ...preset
})
