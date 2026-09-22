import type { ConfigContext, ExpoConfig } from 'expo/config'

/** Expo 55+ 支持；`@expo/config-types` 的 `Android` 类型可能尚未收录 */
type AndroidConfig = NonNullable<ExpoConfig['android']> & {
  edgeToEdgeEnabled?: boolean
}

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
  name: 'Ray',
  slug: 'ray',
  scheme: 'ray',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './public/images/icon/ios.png',
  userInterfaceStyle: 'automatic',
  assetBundlePatterns: ['**/*'],
  platforms: ['ios', 'android'],
  updates: {
    url: process.env.EXPO_PUBLIC_EAS_UPDATES_URL ?? 'https://u.expo.dev/placeholder'
  },
  ios: {
    bundleIdentifier: 'com.ray.mobile',
    supportsTablet: true,
    usesAppleSignIn: true,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false
    }
  },
  android: ((): AndroidConfig => ({
    package: 'com.ray.mobile',
    edgeToEdgeEnabled: true,
    adaptiveIcon: {
      monochromeImage: './public/images/icon/android/monochrome.png',
      foregroundImage: './public/images/icon/android/adaptive.png',
      backgroundColor: '#0D121C'
    }
  }))(),
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
    'expo-font',
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
