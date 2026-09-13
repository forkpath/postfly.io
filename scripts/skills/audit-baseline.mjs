// 只读采集迁移基线，报告只能写入显式指定的新文件；不提交、不清理、不执行迁移。
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const args = process.argv.slice(2)
if (args.length !== 3) {
  throw new Error('Usage: node scripts/skills/audit-baseline.mjs <base-ref> <head-ref> <new-report.json>')
}
const [baseRef, headRef, output] = args
const git = (...args) =>
  execFileSync('git', args, {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024
  })
const root = git('rev-parse', '--show-toplevel').trim()
if (resolve(process.cwd()) !== root) throw new Error('Run from the repository root')
if (existsSync(output)) throw new Error('Refusing to overwrite an existing report')
const ref = value => git('rev-parse', '--verify', '--end-of-options', `${value}^{commit}`).trim()
const base = ref(baseRef)
const head = ref(headRef)
if (head !== ref('HEAD')) throw new Error('Graph must describe the current HEAD, not a historical checkout')
execFileSync('git', ['merge-base', '--is-ancestor', base, head])
const initialStatus = git('status', '--porcelain=v1', '-z', '--untracked-files=all')

function classify(path) {
  if (path === '.vscode/settings.json' || path === 'components.json') return 'configuration'
  if (path.startsWith('docker/') && path.endsWith('.sh')) return 'migration-code'
  if (/(^|\/)(generated|dist|build|coverage|artifacts)\/|\.gen\.|\.tsbuildinfo$/.test(path)) return 'generated-artifact'
  if (/(^|\/)(AGENTS|SKILL|README)\.md$|\.(md|mdc|html)$/.test(path)) return 'documentation'
  if (
    /(^|\/)(project|package|tsconfig[^/]*|nx|skills-lock)\.json$|(^|\/)(eslint|vite|vitest|webpack|playwright|prisma|wxt|tailwind|postcss|forge)\.config\.|\.(ya?ml|toml|json5)$|(^|\/)(Dockerfile|[^/]+\.Dockerfile|\.env[^/]*|\.gitignore|\.dockerignore|\.npmrc|\.nvmrc|\.node-version|\.prettierrc.*|migration-class)$/.test(
      path
    )
  )
    return 'configuration'
  if (/^(apps|services|libs|scripts|tools)\//.test(path)) return 'migration-code'
  return 'ownership-unconfirmed'
}
function changedFiles(base, head) {
  const parts = git('diff', '--name-status', '--no-renames', '-z', base, head).split('\0').filter(Boolean)
  if (parts.length % 2) throw new Error('Unexpected git name-status format')
  const files = []
  for (let i = 0; i < parts.length; i += 2) {
    files.push({ status: parts[i], path: parts[i + 1], category: classify(parts[i + 1]) })
  }
  return files
}
function worktreeFiles(status) {
  const parts = status.split('\0').filter(Boolean)
  const files = []
  for (let i = 0; i < parts.length; i++) {
    const entry = parts[i]
    const state = entry.slice(0, 2)
    const path = entry.slice(3)
    const file = { status: state, path, category: classify(path) }
    if (/[RC]/.test(state)) file.originalPath = parts[++i]
    files.push(file)
  }
  return files
}
const raw = execFileSync('pnpm', ['nx', 'graph', '--print'], {
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024,
  env: { ...process.env, NX_DAEMON: 'false', NX_NO_CLOUD: 'true' }
})
const graphStart = raw.search(/\{\s*"graph"\s*:/)
if (graphStart < 0) throw new Error('Nx did not return a project graph')
const graph = JSON.parse(raw.slice(graphStart)).graph
const projects = Object.values(graph.nodes)
  .map(node => {
    const projectRoot = node.data.root
    const publicApi = `${projectRoot}/src/index.ts`
    return {
      name: node.name,
      root: projectRoot,
      tags: node.data.tags ?? [],
      publicApi: projectRoot.startsWith('libs/')
        ? {
            path: publicApi,
            exists: existsSync(publicApi),
            sha256: existsSync(publicApi) ? createHash('sha256').update(readFileSync(publicApi)).digest('hex') : null
          }
        : null,
      targets: Object.keys(node.data.targets ?? {}).sort(),
      servicePackaging: projectRoot.startsWith('services/')
        ? {
            sourceManifestExists: existsSync(`${projectRoot}/package.json`),
            targets: Object.fromEntries(
              ['build', 'prune-lockfile', 'copy-workspace-modules', 'package'].map(name => {
                const t = node.data.targets?.[name]
                return [
                  name,
                  t
                    ? {
                        executor: t.executor,
                        options: t.options,
                        dependsOn: t.dependsOn,
                        outputs: t.outputs,
                        cache: t.cache
                      }
                    : null
                ]
              })
            )
          }
        : null
    }
  })
  .sort((a, b) => a.name.localeCompare(b.name))
const edges = Object.values(graph.dependencies)
  .flat()
  .filter(edge => graph.nodes[edge.target])
const visited = new Set()
const stack = new Set()
const cycles = []
function visit(name, path = []) {
  if (stack.has(name)) {
    cycles.push([...path, name])
    return
  }
  if (visited.has(name)) return
  stack.add(name)
  for (const edge of graph.dependencies[name] ?? []) {
    if (graph.nodes[edge.target]) visit(edge.target, [...path, name])
  }
  stack.delete(name)
  visited.add(name)
}
projects.forEach(p => visit(p.name))
const frontendNodeReachability = {}
for (const frontend of ['web', 'desktop', 'mobile', 'extension']) {
  const reachable = new Set()
  function walk(name) {
    for (const edge of graph.dependencies[name] ?? []) {
      if (!graph.nodes[edge.target] || reachable.has(edge.target)) continue
      reachable.add(edge.target)
      walk(edge.target)
    }
  }
  walk(frontend)
  frontendNodeReachability[frontend] = [...reachable].filter(name =>
    graph.nodes[name].data.tags?.includes('runtime:node')
  )
}
const migrationFiles = changedFiles(base, head)
const worktree = worktreeFiles(initialStatus)
const counts = files =>
  files.reduce((counts, f) => {
    counts[f.category] = (counts[f.category] ?? 0) + 1
    return counts
  }, {})
const report = {
  schemaVersion: 1,
  capturedAt: new Date().toISOString(),
  candidate: { base, head, userConfirmed: false },
  methodology: {
    classification:
      'Path-based triage, not per-file semantic approval or deletion authorization. Renames represented as delete/add.',
    currentFiles:
      'Includes all nonignored tracked/untracked changes; ignored artifacts and secrets are not inventoried or read.',
    graph: 'Current checkout; public API hashes and graph do not prove runtime correctness.'
  },
  migrationSummary: counts(migrationFiles),
  migrationFiles,
  worktreeSummary: counts(worktree),
  worktree,
  projects,
  edges,
  cycles,
  frontendNodeReachability
}
if (ref('HEAD') !== head || git('status', '--porcelain=v1', '-z', '--untracked-files=all') !== initialStatus) {
  throw new Error('Repository changed during audit; retry rather than publishing inconsistent evidence')
}
writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx', mode: 0o600 })
console.log(
  JSON.stringify(
    {
      head,
      base,
      migrationFiles: migrationFiles.length,
      categories: report.migrationSummary,
      worktreeFiles: worktree.length,
      projects: projects.length,
      libraries: projects.filter(p => p.publicApi).length,
      edges: edges.length,
      cycles,
      frontendNodeReachability,
      output
    },
    null,
    2
  )
)
