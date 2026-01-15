import type { config } from '../config'

import { en } from './en'
import { zh } from './zh'

export const translations: Record<(typeof config.locales)[number], typeof en & typeof zh> = {
  en,
  zh
} as const
