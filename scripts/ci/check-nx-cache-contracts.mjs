import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const workspaceRoot = fileURLToPath(new URL('../../', import.meta.url))
const require = createRequire(import.meta.url)
const failures = []

function fail(message) {
  failures.push(message)
}

function readJson(path) {
  return JSON.parse(readFileSync(join(workspaceRoot, path), 'utf8'))
}

function envNames(inputs) {
  return new Set(inputs.filter(input => typeof input === 'object' && input?.env).map(input => input.env))
}

function runtimeCommands(inputs) {
  return new Set(inputs.filter(input => typeof input === 'object' && input?.runtime).map(input => input.runtime))
}

function walkCodeFiles(directory, files = []) {
  for (const entry of readdirSync(directory)) {
    if (
      [
        '.cache',
        '.expo',
        '.git',
        '.nx',
        '.output',
        '.vite',
        '.wxt',
        'artifacts',
        'build',
        'build-e2e',
        'coverage',
        'dist',
        'generated',
        'node_modules',
        'tmp'
      ].includes(entry)
    )
      continue

    const path = join(directory, entry)
    const stats = statSync(path)
    if (stats.isDirectory()) {
      walkCodeFiles(path, files)
      continue
    }

    if (/\.(spec|test)\.[cm]?[jt]sx?$/.test(entry)) continue
    if (!['.cjs', '.cts', '.html', '.js', '.jsx', '.mjs', '.mts', '.ts', '.tsx'].includes(extname(entry))) continue
    files.push(path)
  }
  return files
}

function walkTsConfigFiles(directory, files = []) {
  for (const entry of readdirSync(directory)) {
    if (
      [
        '.cache',
        '.expo',
        '.git',
        '.nx',
        '.output',
        '.vite',
        '.wxt',
        'artifacts',
        'build',
        'build-e2e',
        'coverage',
        'dist',
        'generated',
        'node_modules',
        'tmp'
      ].includes(entry)
    )
      continue

    const path = join(directory, entry)
    const stats = statSync(path)
    if (stats.isDirectory()) {
      walkTsConfigFiles(path, files)
      continue
    }

    if (/^tsconfig(?:\.[^.]+)?\.json$/.test(entry)) files.push(path)
  }
  return files
}

function discoverPublicEnvironment() {
  const result = {
    expo: new Set(),
    vite: new Set()
  }
  const expression = /\b(VITE_[A-Z0-9_]+|EXPO_PUBLIC_[A-Z0-9_]+)\b/g

  for (const root of ['apps', 'libs']) {
    for (const file of walkCodeFiles(join(workspaceRoot, root))) {
      const source = readFileSync(file, 'utf8')
      for (const match of source.matchAll(expression)) {
        const name = match[1]
        if (name.startsWith('VITE_')) result.vite.add(name)
        if (name.startsWith('EXPO_PUBLIC_')) result.expo.add(name)
      }
    }
  }

  return result
}

function loadProjectGraph() {
  const nxCli = require.resolve('nx/bin/nx')
  const output = execFileSync(process.execPath, [nxCli, 'graph', '--print'], {
    cwd: workspaceRoot,
    encoding: 'utf8',
    env: { ...process.env, NX_DAEMON: 'false' }
  })
  return JSON.parse(output).graph
}

function verifyProjectGraph(graph) {
  let codeProjects = 0
  const boundaryRules = {
    domain: {
      auth: ['auth', 'platform', 'shared'],
      billing: ['auth', 'billing', 'platform', 'shared'],
      composition: ['auth', 'billing', 'composition', 'organization', 'platform', 'shared'],
      organization: ['auth', 'organization', 'platform', 'shared'],
      platform: ['platform', 'shared'],
      shared: ['platform', 'shared']
    },
    runtime: {
      native: ['native', 'universal'],
      node: ['node', 'universal'],
      universal: ['universal'],
      web: ['universal', 'web']
    },
    type: {
      app: ['contract', 'data-access', 'feature', 'platform', 'ui', 'util'],
      contract: ['contract', 'util'],
      'data-access': ['contract', 'data-access', 'platform', 'util'],
      feature: ['contract', 'data-access', 'feature', 'platform', 'ui', 'util'],
      platform: ['contract', 'data-access', 'platform', 'ui', 'util'],
      ui: ['contract', 'ui', 'util'],
      util: ['util']
    }
  }

  function tagValue(tags, dimension) {
    return tags.find(tag => tag.startsWith(`${dimension}:`))?.slice(dimension.length + 1)
  }

  for (const node of Object.values(graph.nodes)) {
    const sourceRoot = node.data.sourceRoot
    if (!sourceRoot) continue

    const sourcePath = join(workspaceRoot, sourceRoot)
    let sourceFiles = []
    try {
      sourceFiles = walkCodeFiles(sourcePath)
    } catch {
      continue
    }
    if (sourceFiles.length === 0) continue
    codeProjects += 1

    const targets = node.data.targets ?? {}
    if (!targets.lint) fail(`${node.name} has source code but no lint target`)
    if (!targets.typecheck) fail(`${node.name} has source code but no typecheck target`)

    const unitConfigPath = join(workspaceRoot, node.data.root, 'vitest.config.mts')
    if (existsSync(unitConfigPath)) {
      if (!targets.test?.inputs?.includes('unitTestGlobals')) {
        fail(`${node.name}:test must hash unitTestGlobals (coverage policy and mode)`)
      }
      const config = readFileSync(unitConfigPath, 'utf8')
      if (!config.includes(`unitCoverage('${node.data.root}')`)) {
        fail(`${node.name} must apply the shared unit coverage policy`)
      }
      const threshold = readJson('scripts/testing/unit-coverage-thresholds.json')[node.data.root]
      for (const metric of ['statements', 'branches', 'functions', 'lines']) {
        if (!Number.isFinite(threshold?.[metric]) || threshold[metric] <= 0 || threshold[metric] > 100) {
          fail(`${node.name} needs a positive ${metric} coverage threshold`)
        }
      }
    }

    const tags = node.data.tags ?? []
    for (const dimension of ['domain:', 'runtime:', 'type:']) {
      if (tags.filter(tag => tag.startsWith(dimension)).length !== 1) {
        fail(`${node.name} must have exactly one ${dimension.slice(0, -1)} tag`)
      }
    }
  }

  for (const [sourceName, dependencies] of Object.entries(graph.dependencies)) {
    const sourceTags = graph.nodes[sourceName]?.data.tags ?? []
    for (const dependency of dependencies) {
      if (dependency.type === 'implicit') continue

      const targetTags = graph.nodes[dependency.target]?.data.tags ?? []
      if (sourceTags.length === 0 || targetTags.length === 0) continue

      for (const [dimension, rules] of Object.entries(boundaryRules)) {
        const sourceValue = tagValue(sourceTags, dimension)
        const targetValue = tagValue(targetTags, dimension)
        if (!sourceValue || !targetValue) continue

        const allowed = rules[sourceValue] ?? []
        if (!allowed.includes(targetValue)) {
          fail(
            `${sourceName} (${dimension}:${sourceValue}) may not depend on ` +
              `${dependency.target} (${dimension}:${targetValue})`
          )
        }
      }

      const sourceDomain = tagValue(sourceTags, 'domain')
      const targetDomain = tagValue(targetTags, 'domain')
      const targetType = tagValue(targetTags, 'type')
      if (['billing', 'organization'].includes(sourceDomain) && targetDomain === 'auth' && targetType !== 'contract') {
        fail(`${sourceName} may depend on Auth contracts, but not on ${dependency.target} (${targetType})`)
      }
    }
  }

  const visiting = new Set()
  const visited = new Set()
  function visit(project, path = []) {
    if (visiting.has(project)) {
      fail(`project graph cycle detected: ${[...path, project].join(' -> ')}`)
      return
    }
    if (visited.has(project)) return

    visiting.add(project)
    for (const dependency of graph.dependencies[project] ?? []) visit(dependency.target, [...path, project])
    visiting.delete(project)
    visited.add(project)
  }
  for (const project of Object.keys(graph.nodes)) visit(project)

  return codeProjects
}

function verifyNoWildcardLibraryPaths() {
  const configs = walkTsConfigFiles(workspaceRoot).map(path => path.slice(workspaceRoot.length))

  for (const configPath of configs) {
    const config = readJson(configPath)
    for (const alias of Object.keys(config.compilerOptions?.paths ?? {})) {
      if (/^@libs\/[^/]+\/\*$/.test(alias)) fail(`${configPath} exposes arbitrary deep imports through ${alias}`)
    }
  }
}

function verifyWorkflowActionPins() {
  const workflowDirectory = join(workspaceRoot, '.github/workflows')
  let actionReferences = 0

  for (const entry of readdirSync(workflowDirectory)) {
    if (!entry.endsWith('.yml') && !entry.endsWith('.yaml')) continue
    const source = readFileSync(join(workflowDirectory, entry), 'utf8')

    if (/\bnpx\b/.test(source)) fail(`${entry} must not download temporary CLI packages with npx`)

    for (const match of source.matchAll(/^\s*(?:-\s*)?uses:\s*([^\s#]+)/gm)) {
      const reference = match[1]
      if (reference.startsWith('./') || reference.startsWith('docker://')) continue

      actionReferences += 1
      const separator = reference.lastIndexOf('@')
      const revision = separator >= 0 ? reference.slice(separator + 1) : ''
      if (!/^[0-9a-f]{40}$/.test(revision)) {
        fail(`${entry} action must use a full Commit SHA: ${reference}`)
      }
    }
  }

  return actionReferences
}

function requireNamedInput(nx, name, required) {
  const configured = envNames(nx.namedInputs?.[name] ?? [])
  for (const variable of required) {
    if (!configured.has(variable)) fail(`${name} does not hash ${variable}`)
  }
  return configured
}

function requireTargetInput(project, targetName, input) {
  const target = project.targets?.[targetName]
  if (!target) {
    fail(`${project.name}:${targetName} is missing`)
    return
  }
  if (!target.inputs?.includes(input)) fail(`${project.name}:${targetName} does not include ${input}`)
}

function requireCacheDisabled(nx, project, targetName) {
  const target = project.targets?.[targetName]
  if (!target) {
    fail(`${project.name}:${targetName} is missing`)
    return
  }
  if (target.cache !== false && nx.targetDefaults?.[targetName]?.cache !== false) {
    fail(`${project.name}:${targetName} must explicitly disable Nx Cache`)
  }
}

const nx = readJson('nx.json')
const publicEnvironment = discoverPublicEnvironment()
const projectGraph = loadProjectGraph()
const codeProjects = verifyProjectGraph(projectGraph)
verifyNoWildcardLibraryPaths()
const workflowActionReferences = verifyWorkflowActionPins()
const sharedRuntime = runtimeCommands(nx.namedInputs?.sharedGlobals ?? [])

const unitTestGlobals = nx.namedInputs?.unitTestGlobals ?? []
for (const file of ['unit-coverage.mts', 'unit-coverage-thresholds.json']) {
  if (!unitTestGlobals.includes(`{workspaceRoot}/scripts/testing/${file}`))
    fail(`Coverage policy ${file} is not hashed`)
}
if (!envNames(unitTestGlobals).has('RAY_TEST_COVERAGE')) fail('Coverage mode is not hashed')
const ciWorkflow = readFileSync(join(workspaceRoot, '.github/workflows/ci.yml'), 'utf8')
if (!/^      RAY_TEST_COVERAGE: 'true'$/m.test(ciWorkflow)) fail('CI must enable unit coverage')

for (const command of ['node --version', `node -p "process.platform + '-' + process.arch"`]) {
  if (!sharedRuntime.has(command)) fail(`sharedGlobals does not hash runtime input: ${command}`)
}

const viteEnvironment = requireNamedInput(nx, 'viteBuildEnvironment', publicEnvironment.vite)
const expoEnvironment = requireNamedInput(nx, 'expoBuildEnvironment', publicEnvironment.expo)
for (const variable of ['MODE', 'NODE_ENV', 'RAY_EXTENSION_E2E']) {
  if (!viteEnvironment.has(variable)) fail(`viteBuildEnvironment does not hash ${variable}`)
}
if (!expoEnvironment.has('NODE_ENV')) fail('expoBuildEnvironment does not hash NODE_ENV')
if (!expoEnvironment.has('RAY_MOBILE_E2E')) fail('expoBuildEnvironment does not hash RAY_MOBILE_E2E')

const web = readJson('apps/web/project.json')
const desktop = readJson('apps/desktop/project.json')
const extension = readJson('apps/extension/project.json')
const mobile = readJson('apps/mobile/project.json')
const pgDao = readJson('libs/pg-dao/project.json')
const authServer = readJson('libs/auth-server/project.json')
const webE2e = readJson('apps/web-e2e/project.json')

requireTargetInput(web, 'build', 'viteBuildEnvironment')
requireTargetInput(desktop, 'build', 'viteBuildEnvironment')
requireTargetInput(extension, 'build-chrome', 'viteBuildEnvironment')
requireTargetInput(extension, 'build-firefox', 'viteBuildEnvironment')
requireTargetInput(mobile, 'export', 'expoBuildEnvironment')

for (const target of ['deploy', 'format', 'migrate', 'prisma', 'push', 'reset', 'seed', 'studio']) {
  requireCacheDisabled(nx, pgDao, target)
}
for (const target of ['package', 'release']) requireCacheDisabled(nx, desktop, target)
for (const target of ['release', 'submit']) requireCacheDisabled(nx, mobile, target)
requireCacheDisabled(nx, authServer, 'seed')
for (const target of ['e2e', 'e2e-ci', 'e2e-ci--src/platform-critical-flows.spec.ts']) {
  requireCacheDisabled(nx, webE2e, target)
}

const generate = pgDao.targets?.generate
if (!generate?.cache) fail('pg-dao:generate must be cacheable')
if (!generate?.outputs?.includes('{projectRoot}/src/generated')) {
  fail('pg-dao:generate must declare its generated client output')
}
if (generate?.inputs?.some(input => input === 'default' || input === 'production')) {
  fail('pg-dao:generate inputs must exclude its generated output directory')
}

if (failures.length > 0) {
  console.error('Nx cache contract verification failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exitCode = 1
} else {
  console.log(
    `Nx cache contracts passed: ${publicEnvironment.vite.size} Vite variables, ` +
      `${publicEnvironment.expo.size} Expo variables, ${codeProjects} code projects, ` +
      `${workflowActionReferences} pinned workflow actions, runtime/platform inputs, ` +
      'project boundaries and side-effect exclusions.'
  )
}
