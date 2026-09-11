import type { Preset } from 'envin/types'

import { defineEnv } from 'envin'

import { preset as providerPreset } from './providers/env'

export const preset = {
  id: 'email',
  extends: [providerPreset]
} as const satisfies Preset

export const env = defineEnv({
  ...preset
})
