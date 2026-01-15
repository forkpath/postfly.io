import type { Preset } from 'envin/types'

import { defineEnv } from 'envin'
import * as z from 'zod'

export const sharedPreset = {
  id: 'shared',
  server: {
    EMAIL_FROM: z.string()
  }
} as const satisfies Preset

export const sharedEnv = defineEnv({
  ...sharedPreset
})
