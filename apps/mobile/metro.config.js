const path = require('node:path')
const { getDefaultConfig } = require('expo/metro-config')
const { mergeConfig } = require('@expo/metro/metro-config')
const { withUniwindConfig } = require('uniwind/metro')

const projectRoot = __dirname
const defaultConfig = getDefaultConfig(projectRoot)
const { assetExts, sourceExts } = defaultConfig.resolver

const customConfig = {
  // Expo handles workspace packages; include the root-owned Nx source libs.
  watchFolders: [path.resolve(projectRoot, '../../libs')],
  transformer: {
    babelTransformerPath: require.resolve('react-native-svg-transformer/expo')
  },
  resolver: {
    assetExts: assetExts.filter(ext => ext !== 'svg'),
    sourceExts: [...sourceExts, 'svg']
  }
}

module.exports = withUniwindConfig(mergeConfig(defaultConfig, customConfig), {
  cssEntryFile: './src/assets/styles/globals.css'
})
