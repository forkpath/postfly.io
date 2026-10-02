const { join } = require('node:path')

const { formatFiles, generateFiles, names, visitNotIgnoredFiles } = require('@nx/devkit')
const ts = require('typescript')

const engine = 'services/engine/src'
const appPath = `${engine}/app.module.ts`
const payloadIndex = 'libs/payload/src/index.ts'
const clientIndex = 'libs/api-client/src/index.ts'
const domainsIndex = 'libs/api-client/src/domains/index.ts'
const reserved = new Set([
  'api',
  'auth',
  'admin',
  'health',
  'organization',
  'user',
  'billing',
  'storage',
  'constructor',
  'prototype',
  'then',
  'prisma',
  'prisma-client'
])

function required(tree, path) {
  const content = tree.read(path, 'utf8')
  if (content === null) throw new Error(`Not a compatible Ray workspace: missing ${path}`)
  return content
}

// Edit only the composition root. Do not reprint (or discard comments from) the rest of AppModule.
function registerModule(source, options) {
  const ast = ts.createSourceFile(appPath, source, ts.ScriptTarget.Latest, true)
  const app = ast.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === 'AppModule')
  const decorator =
    app &&
    ts
      .getDecorators(app)
      ?.find(node => ts.isCallExpression(node.expression) && node.expression.expression.getText(ast) === 'Module')
  const metadata = decorator?.expression.arguments[0]
  const imports =
    metadata &&
    ts.isObjectLiteralExpression(metadata) &&
    metadata.properties.find(node => ts.isPropertyAssignment(node) && node.name.getText(ast) === 'imports')
  if (!imports || !ts.isArrayLiteralExpression(imports.initializer)) {
    throw new Error('AppModule must declare a literal @Module({ imports: [...] }) array')
  }
  const symbol = `${options.className}Module`
  if (new RegExp(`\\b${symbol}\\b`).test(source)) throw new Error(`Module already exists: ${symbol}`)
  const position = imports.initializer.getStart(ast) + 1
  return (
    `import { ${symbol} } from './presentation/http/${options.name}/${options.name}.module'\n` +
    source.slice(0, position) +
    `\n${symbol},` +
    source.slice(position)
  )
}

function migrationPath(tree, name) {
  const directory = 'libs/pg-dao/src/migrations'
  const latest = tree
    .children(directory)
    .filter(value => /^\d{14}_/.test(value))
    .sort()
    .at(-1)
    ?.slice(0, 14)
  if (!latest) throw new Error('Expected the existing Ray migration baseline')
  const date = new Date(
    `${latest.slice(0, 4)}-${latest.slice(4, 6)}-${latest.slice(6, 8)}T${latest.slice(8, 10)}:${latest.slice(10, 12)}:${latest.slice(12)}Z`
  )
  if (Number.isNaN(date.getTime())) throw new Error('Latest migration has an invalid timestamp')
  date.setUTCSeconds(date.getUTCSeconds() + 1)
  const next = date.toISOString().replace(/\D/g, '').slice(0, 14)
  return `${directory}/${next}_add_${name.replaceAll('-', '_')}/migration.sql`
}

async function resourceGenerator(tree, schema) {
  for (const [key, limit] of [
    ['name', 32],
    ['plural', 40]
  ]) {
    if (
      typeof schema[key] !== 'string' ||
      schema[key].length > limit ||
      !/^[a-z][a-z0-9]*(?:-[a-z][a-z0-9]*)*$/.test(schema[key])
    ) {
      throw new Error(`${key} must be kebab-case, at most ${limit} characters`)
    }
  }
  if (!['user', 'organization'].includes(schema.ownership)) throw new Error('Choose user or organization ownership')
  if (reserved.has(schema.name) || reserved.has(schema.plural) || schema.name === schema.plural) {
    throw new Error('Choose a distinct, non-reserved singular name and plural route')
  }
  const options = {
    ...schema,
    ...names(schema.name),
    org: schema.ownership === 'organization',
    ownerField: schema.ownership === 'organization' ? 'organizationId' : 'userId',
    ownerColumn: schema.ownership === 'organization' ? 'organization_id' : 'user_id',
    table: `ray_${schema.name.replaceAll('-', '_')}`,
    tmpl: ''
  }
  options.route = options.org ? `organizations/:organizationId/${schema.plural}` : schema.plural
  options.migration = migrationPath(tree, schema.name)
  // Preflight ALL shared edits and collision checks before writing to the Nx Tree.
  const app = registerModule(required(tree, appPath), options)
  const payload = required(tree, payloadIndex)
  const client = required(tree, clientIndex)
  const domains = required(tree, domainsIndex)
  const manifestPath = 'ray.resources.json'
  const manifest = tree.exists(manifestPath) ? JSON.parse(required(tree, manifestPath)) : { resources: [] }
  if (!Array.isArray(manifest.resources)) throw new Error('Invalid ray.resources.json manifest')
  required(tree, 'libs/pg-dao/src/schema.prisma')
  const collisions = []
  visitNotIgnoredFiles(tree, 'libs/pg-dao/src/models', path => {
    if (new RegExp(`\\bmodel\\s+${options.className}\\b|@@map\\("${options.table}"\\)`).test(tree.read(path, 'utf8')))
      collisions.push(path)
  })
  visitNotIgnoredFiles(tree, `${engine}/presentation/http`, path => {
    if (path.endsWith('.controller.ts') && required(tree, path).includes(`'${options.route}'`)) collisions.push(path)
  })
  for (const path of [
    `${engine}/domain/${schema.name}`,
    `${engine}/application/use-cases/${schema.name}`,
    `${engine}/application/commands/${schema.name}`,
    `${engine}/application/queries/${schema.name}`,
    `${engine}/infrastructure/repositories/${schema.name}`,
    `${engine}/presentation/http/${schema.name}`,
    `libs/pg-dao/src/models/${schema.name}.prisma`,
    `libs/payload/src/schemas/${schema.name}.ts`,
    `libs/payload/src/schemas/${schema.name}.spec.ts`,
    `libs/api-client/src/domains/${schema.name}.ts`,
    `services/engine/tests/${schema.name}.e2e.spec.ts`,
    `libs/api-client/src/domains/${schema.name}.spec.ts`,
    options.migration
  ]) {
    if (tree.exists(path) || tree.children(path).length) collisions.push(path)
  }
  if (collisions.length) throw new Error(`Refusing to overwrite existing resource: ${collisions.join(', ')}`)
  generateFiles(tree, join(__dirname, 'files'), '.', options)
  tree.write(appPath, app)
  tree.write(payloadIndex, `${payload}\nexport * from './schemas/${schema.name}'\n`)
  tree.write(domainsIndex, `${domains}\nexport * from './${schema.name}'\n`)
  tree.write(
    manifestPath,
    JSON.stringify(
      { resources: [...manifest.resources, { name: schema.name, plural: schema.plural, ownership: schema.ownership }] },
      null,
      2
    )
  )
  tree.write(
    clientIndex,
    `${client}\nexport { ${options.propertyName}Keys, ${options.propertyName}Queries, ${options.propertyName}Mutations, clear${options.className}Scope } from './domains/${schema.name}'\nexport type { ${options.className}ClientScope } from './domains/${schema.name}'\n`
  )
  await formatFiles(tree)
}

module.exports = resourceGenerator
