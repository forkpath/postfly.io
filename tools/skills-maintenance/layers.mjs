// 服务内部层次检查。解析源码依赖，不执行被检查代码。
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

import ts from 'typescript'

export function inspectLayers(root, { requireStructure = false } = {}) {
  const files = []
  function walk(path) {
    for (const f of readdirSync(path, { withFileTypes: true })) {
      if (f.name === 'node_modules' || f.name.startsWith('.')) continue
      const full = join(path, f.name)
      if (f.isDirectory()) walk(full)
      else if (/\.[cm]?[jt]sx?$/.test(f.name) && !/[.](test|spec)[.]/.test(f.name)) files.push(full)
    }
  }
  walk(root)
  const configPath = ts.findConfigFile(root, ts.sys.fileExists)
  const compilerOptions = configPath
    ? ts.parseJsonConfigFileContent(
        ts.readConfigFile(configPath, ts.sys.readFile).config,
        ts.sys,
        resolve(configPath, '..')
      ).options
    : { moduleResolution: ts.ModuleResolutionKind.Bundler, baseUrl: root }
  const graph = new Map(),
    roles = new Map(),
    errors = []
  for (const file of files) {
    const ast = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true)
    const imports = []
    const declaredRoles = new Set()
    function visit(node) {
      if (ts.isClassDeclaration(node) && node.name) {
        if (/UseCase$/.test(node.name.text)) declaredRoles.add('usecase')
        if (/Handler$/.test(node.name.text)) declaredRoles.add('handler')
      }
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier)
      )
        imports.push(node.moduleSpecifier.text)
      if (
        ts.isCallExpression(node) &&
        (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
          (ts.isIdentifier(node.expression) && node.expression.text === 'require'))
      ) {
        if (node.arguments[0] && ts.isStringLiteral(node.arguments[0])) imports.push(node.arguments[0].text)
        else errors.push({ file: relative(root, file), reason: 'Unverifiable computed import' })
      }
      if (
        ts.isImportEqualsDeclaration(node) &&
        ts.isExternalModuleReference(node.moduleReference) &&
        node.moduleReference.expression &&
        ts.isStringLiteral(node.moduleReference.expression)
      )
        imports.push(node.moduleReference.expression.text)
      ts.forEachChild(node, visit)
    }
    visit(ast)
    roles.set(file, declaredRoles)
    const edges = imports.map(spec => {
      const found = ts.resolveModuleName(spec, file, compilerOptions, ts.sys).resolvedModule
      return { spec, target: found?.resolvedFileName ? resolve(found.resolvedFileName) : null }
    })
    graph.set(resolve(file), edges)
  }
  let domainCount = 0,
    usecaseCount = 0,
    handlerCount = 0
  for (const file of files) {
    const name = '/' + relative(root, file).replaceAll('\\', '/')
    const domain = name.includes('/domain/'),
      usecase = /\/application\/use-cases(?:\/|\.)/.test(name) || roles.get(file).has('usecase'),
      handler = /\/application\/(commands|queries|handlers)(?:\/|\.)/.test(name) || roles.get(file).has('handler')
    if (domain) domainCount++
    if (usecase) usecaseCount++
    if (handler) handlerCount++
    if (!domain && !usecase && !handler) continue
    const queue = [resolve(file)],
      seen = new Set()
    while (queue.length) {
      const current = queue.shift()
      if (seen.has(current)) continue
      seen.add(current)
      for (const edge of graph.get(current) ?? []) {
        const destination = edge.target ? '/' + relative(root, edge.target).replaceAll('\\', '/') : edge.spec
        const io =
          /^(pg|ioredis|ws|mongoose|stripe|better-auth)(\/|$)|^@prisma\/|^@aws-sdk\/|^@libs\/(pg-dao|mongo-dao|auth-server|billing-server)/.test(
            edge.spec
          )
        const forbidden =
          io ||
          destination.includes('/infrastructure/') ||
          destination.includes('/presentation/') ||
          (domain &&
            (edge.spec.startsWith('@nestjs/') ||
              edge.spec === '@libs/payload' ||
              destination.includes('/application/'))) ||
          (usecase && (edge.spec.startsWith('@nestjs/') || destination.includes('/dtos/'))) ||
          (handler && current === resolve(file) && destination.includes('/domain/repositories/'))
        if (forbidden)
          errors.push({
            file: relative(root, file),
            via: relative(root, current),
            dependency: edge.spec,
            reason: 'Forbidden layer dependency'
          })
        if (edge.target && graph.has(edge.target)) queue.push(edge.target)
      }
    }
  }
  if (requireStructure)
    for (const [layer, count] of [
      ['domain', domainCount],
      ['usecase', usecaseCount],
      ['handler', handlerCount]
    ])
      if (!count) errors.push({ file: '.', reason: 'Missing identifiable business layer: ' + layer })
  return errors
}
