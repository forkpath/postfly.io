import type { ConfigContext, ExpoConfig } from 'expo/config'

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
  name: 'Ray Mobile',
  slug: 'ray-mobile',
  scheme: 'ray-mobile',
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
  android: {
    package: 'com.ray.mobile',
    edgeToEdgeEnabled: true,
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
