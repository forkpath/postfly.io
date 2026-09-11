import type { Preset } from 'envin/types'

import { defineEnv } from 'envin'
import * as z from 'zod'

import { NodeEnv } from '@libs/common'

export const preset = {
  id: 'pg',
  server: {
    POSTGRES_DATABASE_URL: z.url().optional(),
    POSGTRES_DATABASE_URL: z.url().optional()
  }
} as const satisfies Preset

export const env = defineEnv({
  ...preset,
  env: {
    POSTGRES_DATABASE_URL: process.env['POSTGRES_DATABASE_URL'],
    POSGTRES_DATABASE_URL: process.env['POSGTRES_DATABASE_URL']
  },
  shared: {
    NODE_ENV: z.enum(NodeEnv).default(NodeEnv.DEVELOPMENT)
  }
})

export function getPostgresDatabaseUrl(): string {
  if (env.POSTGRES_DATABASE_URL) {
    return env.POSTGRES_DATABASE_URL
  }

  if (env.POSGTRES_DATABASE_URL) {
    if (env.NODE_ENV !== NodeEnv.PRODUCTION) {
      console.warn('POSGTRES_DATABASE_URL is deprecated; use POSTGRES_DATABASE_URL')
    }

    return env.POSGTRES_DATABASE_URL
  }

  throw new Error('POSTGRES_DATABASE_URL is required')
}
