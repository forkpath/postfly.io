function readMobileEnv(key: string): string | undefined {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key]
  }

  return undefined
}

export const mobileBillingEnv = {
  EXPO_PUBLIC_REVENUECAT_IOS_API_KEY:
    readMobileEnv('EXPO_PUBLIC_REVENUECAT_IOS_API_KEY') ?? readMobileEnv('EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY'),
  EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY:
    readMobileEnv('EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY') ?? readMobileEnv('EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY')
} as const
