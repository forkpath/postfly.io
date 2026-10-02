import type { ConfigContext, ExpoConfig } from 'expo/config'

// A separate installed app keeps device tests away from real accounts and OTA.
const isE2E = process.env.RAY_MOBILE_E2E === 'true'

const SPLASH = {
  imageWidth: 150,
  image: './public/images/splash/splash.png',
  dark: {
    image: './public/images/splash/splash.png',
    backgroundColor: '#0D121C'
  }
} as const

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: isE2E ? 'Ray E2E' : 'Ray',
  slug: 'ray',
  scheme: isE2E ? 'ray-e2e' : 'ray',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './public/images/icon/ios.png',
  userInterfaceStyle: 'automatic',
  assetBundlePatterns: ['**/*'],
  platforms: ['ios', 'android'],
  updates: {
    enabled: !isE2E,
    url: process.env.EXPO_PUBLIC_EAS_UPDATES_URL ?? 'https://u.expo.dev/placeholder'
  },
  ios: {
    bundleIdentifier: isE2E ? 'com.ray.mobile.e2e' : 'com.ray.mobile',
    supportsTablet: true,
    usesAppleSignIn: true,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      ...(isE2E && { NSAppTransportSecurity: { NSAllowsLocalNetworking: true } })
    }
  },
  android: {
    package: isE2E ? 'com.ray.mobile.e2e' : 'com.ray.mobile',
    adaptiveIcon: {
      monochromeImage: './public/images/icon/android/monochrome.png',
      foregroundImage: './public/images/icon/android/adaptive.png',
      backgroundColor: '#0D121C'
    }
  },
  extra: {
    eas: {
      projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? ''
    }
  },
  experiments: {
    tsconfigPaths: true,
    typedRoutes: true
  },
  runtimeVersion: {
    policy: 'appVersion'
  },
  plugins: [
    'expo-router',
    '@sentry/react-native',
    'expo-font',
    'expo-image',
    'expo-secure-store',
    'expo-image-picker',
    'expo-web-browser',
    'expo-apple-authentication',
    '@react-native-google-signin/google-signin',
    'expo-localization',
    [
      'expo-build-properties',
      {
        ios: {
          // Google Sign-In's Swift AppCheck dependency needs module maps when
          // Expo's default static-library linkage is used.
          extraPods: [
            { name: 'GoogleUtilities', modular_headers: true },
            { name: 'RecaptchaInterop', modular_headers: true }
          ]
        },
        android: {
          enableProguardInReleaseBuilds: true,
          ...(isE2E && { usesCleartextTraffic: true }),
          extraProguardRules: '-keep public class com.horcrux.svg.** {*;}',
          allowBackup: false
        }
      }
    ],
    [
      'expo-tracking-transparency',
      {
        userTrackingPermission: 'This identifier will be used to deliver personalized ads to you.'
      }
    ],
    ['expo-splash-screen', SPLASH]
  ]
})
