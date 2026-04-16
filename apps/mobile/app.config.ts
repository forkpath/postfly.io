import type { ConfigContext, ExpoConfig } from 'expo/config'

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Ray Mobile',
  slug: 'ray-mobile',
  scheme: 'ray-mobile',
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  assetBundlePatterns: ['**/*'],
  experiments: {
    tsconfigPaths: true,
    typedRoutes: true
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.ray.mobile'
  },
  android: {
    package: 'com.mist.mobile',
    edgeToEdgeEnabled: true
  },
  plugins: ['expo-router', 'expo-secure-store']
})
