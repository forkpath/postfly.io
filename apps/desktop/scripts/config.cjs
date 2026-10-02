const path = require('node:path')
const fs = require('node:fs')

function updateUrl(base, platform, arch, test = false) {
  if (!base) return undefined
  const url = new URL(base)
  if (url.username || url.password || url.search || url.hash)
    throw new Error('Update URL must not contain credentials, query or fragment')
  if (
    url.protocol !== 'https:' &&
    !(test && url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname))
  ) {
    throw new Error('Update URL requires HTTPS (loopback HTTP is test-only)')
  }
  return `${url.href.replace(/\/$/, '')}/stable/${platform}/${arch}/`
}

function validateRelease(env, platform, version) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Only stable semver releases are supported')
  if (env.GITHUB_REF !== `refs/tags/desktop-v${version}`) throw new Error(`Release requires tag desktop-v${version}`)
  if (!env.DESKTOP_UPDATE_BASE_URL) throw new Error('DESKTOP_UPDATE_BASE_URL is required')
  updateUrl(env.DESKTOP_UPDATE_BASE_URL, platform, 'x64')
  const api = env.VITE_API_ENDPOINT || env.VITE_API_BASE_URL
  if (!api || new URL(api).protocol !== 'https:') throw new Error('Release requires a production HTTPS API endpoint')
  const required =
    platform === 'darwin'
      ? ['CSC_LINK', 'CSC_KEY_PASSWORD', 'APPLE_ID', 'APPLE_APP_SPECIFIC_PASSWORD', 'APPLE_TEAM_ID']
      : ['WIN_CSC_LINK', 'WIN_CSC_KEY_PASSWORD', 'DESKTOP_WIN_PUBLISHER']
  for (const key of required) if (!env[key]) throw new Error(`Missing release credential: ${key}`)
}

function createConfig(env = process.env, platform = process.platform, arch = env.DESKTOP_ARCH || process.arch) {
  const profile = env.DESKTOP_PROFILE || 'local'
  if (!['local', 'test', 'release'].includes(profile)) throw new Error('Unknown desktop profile')
  if (
    !['darwin', 'win32'].includes(platform) ||
    !['arm64', 'x64'].includes(arch) ||
    (platform === 'win32' && arch !== 'x64')
  ) {
    throw new Error(`Unsupported desktop target ${platform}/${arch}`)
  }
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'))
  const version = profile === 'test' ? env.DESKTOP_TEST_VERSION || pkg.version : pkg.version
  if (profile === 'release') validateRelease(env, platform, version)
  const feed = updateUrl(env.DESKTOP_UPDATE_BASE_URL, platform, arch, profile === 'test')
  return {
    ...(profile === 'test' && env.DESKTOP_TEST_CACHE
      ? { appId: `com.forkpath.desktop.${env.DESKTOP_TEST_CACHE}` }
      : { appId: 'com.forkpath.desktop' }),
    productName: 'Ray',
    executableName: 'Ray',
    electronVersion: pkg.devDependencies.electron,
    directories: { output: `../../dist/desktop/${profile}/${platform}/${arch}`, buildResources: 'build-resources' },
    extraMetadata: {
      version,
      desktopUpdatesEnabled: Boolean(feed),
      ...(profile === 'test' && env.DESKTOP_TEST_CACHE ? { name: env.DESKTOP_TEST_CACHE } : {})
    },
    files: ['.vite/main/**', '.vite/renderer/**', 'package.json', '!**/*.map'],
    asar: true,
    // builder omits app-update.yml for --dir; keep runnable directory packages self-contained.
    afterPack: async context => {
      if (!feed || context.targets.some(target => ['dmg', 'zip', 'nsis'].includes(target.name))) return
      const resources = context.packager.getResourcesDir(context.appOutDir)
      const update = {
        provider: 'generic',
        url: feed,
        channel: 'latest',
        updaterCacheDirName: context.packager.appInfo.updaterCacheDirName,
        ...(platform === 'win32' && profile === 'release' ? { publisherName: [env.DESKTOP_WIN_PUBLISHER] } : {})
      }
      await fs.promises.writeFile(path.join(resources, 'app-update.yml'), require('yaml').stringify(update))
    },
    // electron-builder expands these placeholders, not JavaScript.
    // eslint-disable-next-line no-template-curly-in-string
    artifactName: 'Ray-${version}-${os}-${arch}.${ext}',
    forceCodeSigning: profile === 'release',
    electronFuses: {
      runAsNode: false,
      enableCookieEncryption: true,
      enableNodeOptionsEnvironmentVariable: false,
      enableNodeCliInspectArguments: profile === 'test',
      enableEmbeddedAsarIntegrityValidation: true,
      onlyLoadAppFromAsar: true
    },
    publish: feed ? [{ provider: 'generic', url: feed, channel: 'latest' }] : null,
    mac: {
      target: ['dmg', 'zip'],
      icon: 'build-resources/icon.icns',
      category: 'public.app-category.productivity',
      hardenedRuntime: true,
      entitlements: 'build-resources/entitlements.mac.plist',
      entitlementsInherit: 'build-resources/entitlements.mac.plist',
      ...(profile === 'release' ? { notarize: true } : { identity: null, notarize: false })
    },
    win: {
      target: ['nsis'],
      icon: 'build-resources/icon.ico',
      ...(profile === 'release'
        ? { signtoolOptions: { publisherName: env.DESKTOP_WIN_PUBLISHER } }
        : { signAndEditExecutable: true }),
      verifyUpdateCodeSignature: profile !== 'test'
    },
    nsis: {
      oneClick: false,
      perMachine: false,
      allowToChangeInstallationDirectory: true,
      deleteAppDataOnUninstall: false,
      ...(profile === 'test'
        ? {
            shortcutName: env.DESKTOP_TEST_CACHE || 'Ray Test',
            createDesktopShortcut: false,
            createStartMenuShortcut: false
          }
        : {})
    },
    dmg: { sign: profile === 'release' }
  }
}
module.exports = { createConfig, updateUrl, validateRelease }
