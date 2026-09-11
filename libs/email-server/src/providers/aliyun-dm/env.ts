import type { Preset } from 'envin/types'

import { defineEnv } from 'envin'
import * as z from 'zod'

import { sharedPreset } from '../../utils/env'

export const preset = {
  id: 'aliyun-dm',
  server: {
    ALIYUN_DM_ACCESS_KEY_ID: z.string(),
    ALIYUN_DM_ACCESS_KEY_SECRET: z.string(),
    ALIYUN_DM_ACCOUNT_NAME: z.string(),
    ALIYUN_DM_REPLY_TO_ADDRESS: z.string().optional(),
    ALIYUN_DM_ADDRESS_TYPE: z.string().optional()
  },
  extends: [sharedPreset]
} as const satisfies Preset

export const env = defineEnv({
  ...preset
})
