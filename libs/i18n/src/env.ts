import type { Preset } from 'envin/types'

import { defineEnv } from 'envin'
import * as z from 'zod'

import { Locale } from './types'

export const preset = {
  id: 'i18n',
  clientPrefix: 'VITE_',
  client: {
    VITE_DEFAULT_LOCALE: z.string().optional().default(Locale.EN)
  },
  server: {
    DEFAULT_LOCALE: z.string().optional()
  }
} as const satisfies Preset

export const env = defineEnv({
  ...preset,
  env: {
    DEFAULT_LOCALE: process.env['DEFAULT_LOCALE'],
    VITE_DEFAULT_LOCALE: process.env['VITE_DEFAULT_LOCALE']
  }
})
