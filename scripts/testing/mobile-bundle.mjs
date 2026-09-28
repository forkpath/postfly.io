const requiredRoutes = [
  '/apps/mobile/src/app/_layout.tsx',
  '/apps/mobile/src/app/(setup)/welcome.tsx',
  '/apps/mobile/src/app/(setup)/auth/login.tsx'
]

export function verifyMobileBundle(sourceMap) {
  if (!Array.isArray(sourceMap.sources) || !sourceMap.sources.every(source => typeof source === 'string'))
    throw new Error('Mobile bundle has no valid source list')
  const sources = sourceMap.sources.map(source => `/${source.replaceAll('\\', '/')}`)
  const missing = requiredRoutes.filter(route => !sources.some(source => source.endsWith(route)))
  if (missing.length) throw new Error(`Mobile bundle is missing application routes: ${missing.join(', ')}`)
  return { sourceCount: sources.length, requiredRoutes }
}
