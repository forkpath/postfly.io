export const mobileEnv = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8000',
  defaultLocale: process.env.EXPO_PUBLIC_DEFAULT_LOCALE ?? 'zh'
} as const
