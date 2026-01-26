import type { Preset } from 'envin/types'

import { defineEnv } from 'envin'
import * as z from 'zod'

import { NodeEnv } from '@libs/common'

export const preset = {
  id: 'auth',
  server: {
    BETTER_AUTH_SECRET: z.string(),

    APPLE_CLIENT_ID: z.string().optional().default(''),
    APPLE_CLIENT_SECRET: z.string().optional().default(''),
    APPLE_APP_BUNDLE_IDENTIFIER: z.string().optional().default(''),
    GOOGLE_CLIENT_ID: z.string().optional().default(''),
    GOOGLE_CLIENT_SECRET: z.string().optional().default(''),
    GITHUB_CLIENT_ID: z.string().optional().default(''),
    GITHUB_CLIENT_SECRET: z.string().optional().default(''),

    SEED_EMAIL: z.email().optional().default('forkpath@ray.com'),
    SEED_PASSWORD: z.string().optional().default('Pa$$w0rd')
  }
} as const satisfies Preset

export const env = defineEnv({
  ...preset,
  shared: {
    NODE_ENV: z.enum(NodeEnv).default(NodeEnv.DEVELOPMENT)
  }
})
