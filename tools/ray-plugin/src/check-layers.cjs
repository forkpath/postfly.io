const { readFileSync, readdirSync } = require('node:fs')
const { join, posix, resolve } = require('node:path')
const ts = require('typescript')

const prefix = 'services/engine/src/'
function layer(path) {
  if (!path.startsWith(prefix)) return 'external'
  const relative = path.slice(prefix.length)
  if (relative.startsWith('domain/')) return 'domain'
  if (relative.startsWith('application/use-cases/')) return 'useCase'
  if (/^application\/(commands|queries)\//.test(relative)) return 'cqrs'
  if (relative.startsWith('infrastructure/')) return 'infrastructure'
  if (relative.startsWith('presentation/')) return 'presentation'
  return 'unknown'
}
const allowed = {
  domain: ['domain'],
  useCase: ['domain', 'useCase'],
  cqrs: ['domain', 'useCase', 'cqrs'],
  infrastructure: ['domain', 'useCase', 'infrastructure'],
  presentation: ['domain', 'useCase', 'cqrs', 'infrastructure', 'presentation']
}

function references(source, file) {
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
  const result = []
  function add(node) {
    result.push(node && ts.isStringLiteralLike(node) ? node.text : '<dynamic module>')
  }
  function visit(node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier)
      add(node.moduleSpecifier)
    if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference))
      add(node.moduleReference.expression)
    if (ts.isImportTypeNode(node)) add(ts.isLiteralTypeNode(node.argument) ? node.argument.literal : undefined)
    if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === 'require'))
    )
      add(node.arguments[0])
    ts.forEachChild(node, visit)
  }
  visit(ast)
  return result
}

function checkLayers(files, entries, paths = {}) {
  const errors = []
  const visited = new Set()
  function resolveImport(file, specifier) {
    let target
    if (specifier.startsWith('.')) target = posix.normalize(posix.join(posix.dirname(file), specifier))
    else
      for (const [alias, destinations] of Object.entries(paths)) {
        if (alias === specifier) target = destinations[0]
        else if (alias.endsWith('/*') && specifier.startsWith(alias.slice(0, -1))) {
          target = destinations[0].replace('*', specifier.slice(alias.length - 1))
        }
        if (target) break
      }
    if (!target) return specifier
    return (
      [target, target.replace(/\.[cm]?js$/, '.ts'), `${target}.ts`, `${target}/index.ts`].find(candidate =>
        files.has(candidate)
      ) ?? target
    )
  }
  function visit(file) {
    if (visited.has(file)) return
    visited.add(file)
    const from = layer(file)
    for (const specifier of references(files.get(file) ?? '', file)) {
      const target = resolveImport(file, specifier)
      const to = layer(target)
      const nestAdapter = from === 'cqrs' && ['@nestjs/common', '@nestjs/cqrs'].includes(specifier)
      const database = /^(?:@libs\/(?:pg|mongo)-dao|libs\/(?:pg|mongo)-dao\/|@prisma\/|pg$|mongoose$)/.test(target)
      const composition = from === 'presentation' && !database
      const infraExternal = from === 'infrastructure'
      const externalAllowed =
        to === 'external' && specifier !== '<dynamic module>' && (nestAdapter || composition || infraExternal)
      const controllerBypass = file.endsWith('.controller.ts') && to === 'infrastructure'
      if (controllerBypass || (!allowed[from]?.includes(to) && !externalAllowed))
        errors.push(`${file}: ${from} cannot import ${specifier} (${to})`)
      if (to !== 'external' && files.has(target)) visit(target)
    }
  }
  entries.forEach(visit)
  return errors
}

function checkWorkspace(root) {
  const manifestPath = join(root, 'ray.resources.json')
  let manifest
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return []
    throw error
  }
  const files = new Map()
  function walk(directory) {
    for (const entry of readdirSync(join(root, directory), { withFileTypes: true })) {
      const path = posix.join(directory, entry.name)
      if (entry.isDirectory()) walk(path)
      else if (entry.isFile() && path.endsWith('.ts') && !/\.(spec|test)\.ts$/.test(path))
        files.set(path, readFileSync(join(root, path), 'utf8'))
    }
  }
  walk('services/engine/src')
  const entries = [...files.keys()].filter(file =>
    manifest.resources.some(resource => file.includes(`/${resource.name}/`))
  )
  const config = ts.readConfigFile(join(root, 'services/engine/tsconfig.app.json'), ts.sys.readFile)
  return checkLayers(files, entries, config.config.compilerOptions.paths)
}

module.exports = { checkLayers, checkWorkspace }
if (require.main === module) {
  const errors = checkWorkspace(resolve(__dirname, '../../..'))
  if (errors.length) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else console.log('Generated Engine resource layer boundaries passed')
}
