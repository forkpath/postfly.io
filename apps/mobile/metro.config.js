const path = require('node:path')

const { getDefaultConfig } = require('expo/metro-config')
const { resolve } = require('metro-resolver')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)
const defaultResolveRequest = config.resolver.resolveRequest

function resolveWorkspaceAlias(moduleName) {
  if (moduleName.startsWith('@libs/')) {
    const requestPath = moduleName.slice('@libs/'.length)
    const [libraryName, ...subpath] = requestPath.split('/')
    const libraryRoot = path.resolve(workspaceRoot, 'libs', libraryName, 'src')

    return subpath.length === 0 ? path.join(libraryRoot, 'index') : path.join(libraryRoot, ...subpath)
  }

  if (moduleName.startsWith('~/')) {
    return path.resolve(projectRoot, 'src', moduleName.slice(2))
  }

  return null
}

config.watchFolders = [workspaceRoot]
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules')
]
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const redirectedModule = resolveWorkspaceAlias(moduleName)

  if (redirectedModule) {
    return resolve(
      {
        ...context,
        resolveRequest: defaultResolveRequest
      },
      redirectedModule,
      platform
    )
  }

  if (typeof defaultResolveRequest === 'function') {
    return defaultResolveRequest(context, moduleName, platform)
  }

  return resolve(context, moduleName, platform)
}

module.exports = config
