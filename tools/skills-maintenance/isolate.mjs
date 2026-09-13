// 创建已确认 Git SHA 的隔离副本；不读取工作区业务 .env，不复用已有容器。
import { execFileSync } from 'node:child_process'
import {
  constants,
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { AGENT_DIRECTORIES, RETIRED_AGENT_PATHS, SUPPORTED_AGENTS } from './agents.mjs'
import { overlayCursorCommands } from './command-layout.mjs'
import { readTree, treeDigest } from './core.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const policy = JSON.parse(readFileSync(join(root, 'tools/skills-maintenance/sources.json'), 'utf8'))
const revision = policy.baseline.sha
if (!policy.baseline.confirmed || !/^[a-f0-9]{40}$/.test(revision)) throw new Error('Confirmed baseline required')
const actual = execFileSync('git', ['rev-parse', revision + '^{commit}'], { cwd: root, encoding: 'utf8' }).trim()
if (actual !== revision) throw new Error('Baseline mismatch')
const version = process.argv[2]
if (!['old', 'new'].includes(version)) throw new Error('Usage: isolate.mjs old|new')
const destination = mkdtempSync(join(tmpdir(), 'ray-skill-eval-' + version + '-'))
const archive = execFileSync('git', ['archive', '--format=tar', revision], { cwd: root, maxBuffer: 128 * 1024 * 1024 })
execFileSync('tar', ['-xf', '-', '-C', destination], { input: archive })
if (existsSync(join(destination, '.env'))) throw new Error('Tracked .env is forbidden')
// Only known retired entries inside the fresh archive are removed, for both versions.
for (const path of RETIRED_AGENT_PATHS) {
  const target = join(destination, path)
  if (existsSync(target)) rmSync(target, { recursive: true })
}
const names = ['ray-api-flow', 'ray-rest-api-flow', 'ray-websocket-api-flow', 'ray-module-dev']
if (version === 'new') {
  overlayCursorCommands(root, destination)
  for (const name of names) {
    const path = join(destination, '.agents/skills', name)
    // Only freshly-created, known paths inside this isolated archive are replaced.
    if (existsSync(path)) rmSync(path, { recursive: true })
    cpSync(join(root, '.agents/skills', name), path, { recursive: true })
    for (const agent of AGENT_DIRECTORIES) {
      const link = join(destination, agent, 'skills', name)
      try {
        lstatSync(link)
        rmSync(link, { recursive: true })
      } catch (error) {
        if (error.code !== 'ENOENT') throw error
      }
      mkdirSync(dirname(link), { recursive: true })
      symlinkSync('../../.agents/skills/' + name, link)
    }
  }
  for (const path of [
    'AGENTS.md',
    '.cursor/rules/nestjs-clean-typescript-cursor-rules.mdc',
    '.cursor/rules/optimized-react-typescript-best-practices-modern-ui-ux.mdc'
  ])
    cpSync(join(root, path), join(destination, path))
}
const copyDependencies = path =>
  cpSync(join(root, path), join(destination, path), {
    recursive: true,
    verbatimSymlinks: true,
    mode: constants.COPYFILE_FICLONE,
    filter: source => !source.includes('/node_modules/.vite') && !source.includes('/node_modules/.cache')
  })
copyDependencies('node_modules')
for (const group of ['apps', 'libs', 'services'])
  for (const name of readdirSync(join(root, group))) {
    const path = join(group, name, 'node_modules')
    if (existsSync(join(root, path))) copyDependencies(path)
  }
execFileSync('git', ['init', '--quiet'], { cwd: destination })
const skillDigests = Object.fromEntries(
  names
    .filter(name => existsSync(join(destination, '.agents/skills', name)))
    .map(name => [name, treeDigest(readTree(join(destination, '.agents/skills', name)))])
)
if (version === 'old')
  skillDigests['cursor-ray-module-dev'] = treeDigest(readTree(join(destination, '.cursor/skills/ray-module-dev')))
writeFileSync(
  join(destination, 'EVALUATION-ISOLATION.json'),
  JSON.stringify(
    {
      baseline: revision,
      version,
      commandLayout: version === 'new' ? 'cursor-local-v1' : 'historical-baseline',
      skillDigests,
      supportedAgents: SUPPORTED_AGENTS,
      retiredAgentPathsRemoved: RETIRED_AGENT_PATHS,
      createdAt: new Date().toISOString(),
      sourceWorkspace: root,
      dependencies: 'isolated copy-on-write node_modules including app dependencies; no package upgrades',
      generationTasks: 0
    },
    null,
    2
  ),
  { flag: 'wx' }
)
console.log(JSON.stringify({ destination, baseline: revision, version, skillDigests }, null, 2))
