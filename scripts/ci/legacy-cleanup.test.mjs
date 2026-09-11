/** Prevent retired projects and build-only Vite configs from returning as test entries. */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const root = resolve(import.meta.dirname, '../..')
const read = path => readFileSync(resolve(root, path), 'utf8')
const retired = ['auth', 'billing', 'srv-core', 'srv-shared', 'ui-shared', 'server-platform']

function sourceFiles(directory) {
  return readdirSync(resolve(root, directory), { withFileTypes: true }).flatMap(entry => {
    if (entry.name.startsWith('.') || ['node_modules', 'dist', 'coverage'].includes(entry.name)) return []
    const path = `${directory}/${entry.name}`
    if (entry.isDirectory()) return sourceFiles(path)
    return /\.(?:[cm]?[jt]sx?|json)$/.test(entry.name) ? [path] : []
  })
}

test('retired libraries have no remaining source files or aliases', () => {
  for (const project of retired) {
    const directory = `libs/${project}`
    assert.equal(existsSync(resolve(root, directory)) && sourceFiles(directory).length > 0, false, directory)
  }
  for (const file of ['tsconfig.base.json', 'tsconfig.json', ...['apps', 'libs', 'services'].flatMap(sourceFiles)]) {
    const content = read(file)
    for (const project of retired) {
      assert.doesNotMatch(content, new RegExp(`["']@libs/${project}(?:/[^"']*)?["']`), file)
      assert.doesNotMatch(content, new RegExp(`["'](?:\\./|\\.\\./)*libs/${project}(?:/[^"']*)?["']`), file)
    }
  }
})

test('Vitest discovers dedicated app, library and service configs, not build configs', () => {
  const content = read('vitest.config.ts')
  for (const directory of ['apps', 'libs', 'services']) {
    assert.ok(content.includes(`${directory}/**/vitest.config.{mjs,js,ts,mts}`), directory)
  }
  assert.doesNotMatch(content, /['"][^'"]*\/vite\.config/)
  assert.equal(existsSync(resolve(root, 'vitest.workspace.ts')), false)
})

test('resolved Nx graph excludes retired projects and has no cycles', () => {
  const graph = JSON.parse(
    execFileSync('pnpm', ['nx', 'graph', '--print'], { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
  ).graph
  for (const project of retired) assert.equal(graph.nodes[project], undefined, project)
  const visited = new Set()
  function visit(project, active = new Set()) {
    assert.equal(active.has(project), false, `Cycle at ${project}`)
    if (visited.has(project)) return
    const path = new Set([...active, project])
    for (const edge of graph.dependencies[project] ?? []) {
      assert.equal(retired.includes(edge.target), false, edge.target)
      visit(edge.target, path)
    }
    visited.add(project)
  }
  Object.keys(graph.nodes).forEach(project => visit(project))
})

test('auth schema governance stays wired to its server owner', () => {
  const config = JSON.parse(read('libs/auth-server/project.json'))
  assert.equal(config.targets['schema-check'].options.command, 'node scripts/auth/check-auth-schema.mjs')
  assert.ok(config.targets['schema-check'].inputs.includes('{workspaceRoot}/tools/auth-schema/package.json'))
  const generate = JSON.parse(read('libs/pg-dao/project.json')).targets.generate
  assert.ok(
    generate.dependsOn.some(dependency => dependency.projects === 'auth-server' && dependency.target === 'schema-check')
  )
  for (const file of ['.github/workflows/ci.yml', '.github/workflows/deploy.yml']) {
    assert.match(read(file), /-p pg-dao,auth-server\b/)
    assert.doesNotMatch(read(file), /-p pg-dao,auth(?:\s|$)/)
  }
})
