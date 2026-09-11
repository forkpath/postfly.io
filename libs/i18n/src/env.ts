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

// 安全获取环境变量，支持 Node.js 和浏览器环境
function getEnvVar(key: string): string | undefined {
  // Node.js 环境
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key]
  }
  // 浏览器/Vite 环境。直接引用 import.meta.env，确保 Vite/WXT 能在
  // IIFE content-script 构建中静态替换它，而不是把整个 import.meta 清空。
  const viteEnv = (import.meta as { readonly env?: Record<string, string | undefined> }).env
  if (viteEnv) return viteEnv[key]
  return undefined
}

export const env = defineEnv({
  ...preset,
  env: {
    DEFAULT_LOCALE: getEnvVar('DEFAULT_LOCALE'),
    VITE_DEFAULT_LOCALE: getEnvVar('VITE_DEFAULT_LOCALE')
  }
})
