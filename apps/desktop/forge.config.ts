import type { ForgeConfig } from '@electron-forge/shared-types'

import { MakerDMG } from '@electron-forge/maker-dmg'
import { MakerSquirrel } from '@electron-forge/maker-squirrel'
import { FusesPlugin } from '@electron-forge/plugin-fuses'
import { VitePlugin } from '@electron-forge/plugin-vite'
import { FuseV1Options, FuseVersion } from '@electron/fuses'

const config: ForgeConfig = {
  packagerConfig: {
    name: 'Ray',
    executableName: process.platform === 'linux' ? 'ray' : 'Ray',
    appBundleId: 'com.forkpath.desktop',
    asar: true,
    icon: 'assets/logo',
    ...(process.platform === 'win32' && {
      certificateFile: process.env.CERTIFICATE_PATH,
      certificatePassword: process.env.CERTIFICATE_PASSWORD
    }),
    osxSign: {
      type: 'distribution',
      // Path or name of the keychain that contains your Apple signing certs
      keychain: process.env.APPLE_KEYCHAIN as string,
      optionsForFile: () => ({
        hardenedRuntime: true,
        entitlements: 'entitlements.mac.plist',
        entitlementsInherit: 'entitlements.mac.plist'
      })
    },
    osxNotarize: {
      appleId: process.env.APPLE_ID as string,
      appleIdPassword: process.env.APPLE_ID_PASSWORD as string,
      teamId: process.env.APPLE_TEAM_ID as string,
      keychain: process.env.APPLE_KEYCHAIN as string
    }
  },
  makers: [
    new MakerSquirrel({
      name: 'Ray',
      authors: 'forkpath'
    }),
    new MakerDMG({
      name: 'ray',
      title: 'ray',
      background: '', // 658x498, use background@2x for retina
      icon: 'assets/ray.png'
    })
  ],
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'forkpath',
          name: 'ray'
        },
        prerelease: false,
        draft: true
      }
    }
  ],
  plugins: [
    new VitePlugin({
      build: [
        { entry: 'src/main/main.ts', config: 'vite.main.config.ts', target: 'main' },
        {
          entry: 'src/main/preload.ts',
          config: 'vite.preload.config.ts',
          target: 'preload'
        }
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts'
        }
      ]
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true
    })
  ]
}

export default config
