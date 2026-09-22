const path = require('node:path')
const { getDefaultConfig } = require('expo/metro-config')
const { withUniwindConfig } = require('uniwind/metro')

const projectRoot = __dirname

const config = withUniwindConfig(getDefaultConfig(projectRoot), {
  cssEntryFile: './src/assets/styles/globals.css'
})

// Expo's default config handles monorepo watch folders and isolated pnpm links.
// Nx source libraries are owned by the root package, not separate workspaces.
config.watchFolders.push(path.resolve(projectRoot, '../../libs'))

const { transformer, resolver } = config

config.transformer = {
  ...transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer/expo')
}

config.resolver = {
  ...resolver,
  assetExts: resolver.assetExts.filter(ext => ext !== 'svg'),
  sourceExts: [...resolver.sourceExts, 'svg']
}

module.exports = config
