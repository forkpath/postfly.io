import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, relative, resolve } from 'node:path'
import test from 'node:test'

const workspaceRoot = resolve(import.meta.dirname, '../..')
const legacyProjects = ['server-platform', 'srv-core', 'srv-shared', 'ui-shared']
const legacyAliasPattern = /@libs\/(?:server-platform|srv-core|srv-shared|ui-shared)(?:\/[^'"\s]*)?/
const inspectedExtensions = new Set(['.css', '.js', '.json', '.md', '.mjs', '.mts', '.ts', '.tsx'])
const ignoredDirectories = new Set(['.git', '.nx', 'coverage', 'dist', 'node_modules', 'tmp'])

function runNx(...args) {
  return JSON.parse(
    execFileSync('pnpm', ['exec', 'nx', ...args], {
      cwd: workspaceRoot,
      encoding: 'utf8',
      env: { ...process.env, NX_DAEMON: 'false' }
    })
  )
}

function collectFiles(directory) {
  const files = []

  for (const entry of readdirSync(directory)) {
    if (ignoredDirectories.has(entry)) continue

    const absolutePath = join(directory, entry)
    const stat = statSync(absolutePath)

    if (stat.isDirectory()) {
      files.push(...collectFiles(absolutePath))
      continue
    }

    if (inspectedExtensions.has(extname(entry))) files.push(absolutePath)
  }

  return files
}

function readJson(path) {
  return JSON.parse(readFileSync(resolve(workspaceRoot, path), 'utf8'))
}

test('legacy server and UI projects are absent from the resolved Nx graph', () => {
  const projects = runNx('show', 'projects', '--json')

  for (const project of legacyProjects) {
    assert.equal(projects.includes(project), false, `${project} must not return to the Nx project graph`)
  }
})

test('services depend directly on the owning server adapters', () => {
  const graph = runNx('graph', '--print').graph.dependencies
  const targets = project => new Set(graph[project].map(dependency => dependency.target))

  assert.deepEqual(
    ['auth-server', 'server-nest', 'server-rabbitmq', 'server-redis'].filter(
      targets('engine').has.bind(targets('engine'))
    ),
    ['auth-server', 'server-nest', 'server-rabbitmq', 'server-redis']
  )
  assert.equal(targets('pulse').has('server-redis'), true)
  assert.equal(targets('worker').has('server-rabbitmq'), true)

  for (const dependencies of Object.values(graph)) {
    for (const dependency of dependencies) {
      assert.equal(legacyProjects.includes(dependency.target), false)
    }
  }
})

test('all source and project configuration uses canonical aliases', () => {
  const roots = ['.agents', '.claude', '.codex', '.cursor', '.vscode', 'apps', 'docs', 'libs', 'services', 'tools'].map(
    path => resolve(workspaceRoot, path)
  )
  const files = [resolve(workspaceRoot, 'AGENTS.md'), ...roots.flatMap(collectFiles)]
  const violations = []

  for (const file of files) {
    const workspacePath = relative(workspaceRoot, file)
    const content = readFileSync(file, 'utf8')
    if (legacyAliasPattern.test(content)) violations.push(workspacePath)
  }

  assert.deepEqual(violations, [])

  const rootPaths = readJson('tsconfig.base.json').compilerOptions.paths
  assert.deepEqual(rootPaths['@libs/server-nest'], ['libs/server-nest/src/index.ts'])
  assert.deepEqual(rootPaths['@libs/server-redis'], ['libs/server-redis/src/index.ts'])
  assert.deepEqual(rootPaths['@libs/server-rabbitmq'], ['libs/server-rabbitmq/src/index.ts'])
  assert.deepEqual(rootPaths['@libs/ui-core'], ['libs/ui-core/src/index.ts'])
  assert.deepEqual(rootPaths['@libs/ui-web'], ['libs/ui-web/src/index.ts'])
  assert.deepEqual(rootPaths['@libs/ui-native'], ['libs/ui-native/src/index.ts'])
})

test('service-local TypeScript path overrides include their transitive platform contracts', () => {
  const engine = readJson('services/engine/tsconfig.app.json').compilerOptions.paths
  const pulse = readJson('services/pulse/tsconfig.app.json').compilerOptions.paths
  const worker = readJson('services/worker/tsconfig.app.json').compilerOptions.paths

  assert.deepEqual(engine['@libs/auth-server/nest'], ['libs/auth-server/src/nest/index.ts'])
  assert.deepEqual(engine['@libs/server-kernel'], ['libs/server-kernel/src/index.ts'])
  assert.deepEqual(engine['@libs/server-nest'], ['libs/server-nest/src/index.ts'])
  assert.deepEqual(engine['@libs/server-redis'], ['libs/server-redis/src/index.ts'])
  assert.deepEqual(engine['@libs/server-rabbitmq'], ['libs/server-rabbitmq/src/index.ts'])
  assert.deepEqual(pulse['@libs/server-kernel'], ['libs/server-kernel/src/index.ts'])
  assert.deepEqual(pulse['@libs/server-redis'], ['libs/server-redis/src/index.ts'])
  assert.deepEqual(worker['@libs/server-kernel'], ['libs/server-kernel/src/index.ts'])
  assert.deepEqual(worker['@libs/server-rabbitmq'], ['libs/server-rabbitmq/src/index.ts'])
})
