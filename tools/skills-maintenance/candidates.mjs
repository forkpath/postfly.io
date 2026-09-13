// 仅显式 candidates 操作写新目录；外部内容仍只是候选数据。
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchSource, prepare, readTree, sha256, treeDigest } from './core.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const destination = process.argv[2] && resolve(process.argv[2])
if (!destination || existsSync(destination)) throw new Error('Usage: candidates.mjs NEW_DIRECTORY (must not exist)')
const manifest = JSON.parse(readFileSync(join(root, 'tools/skills-maintenance/sources.json'), 'utf8'))
const report = JSON.parse(
  execFileSync(process.execPath, [join(root, 'tools/skills-maintenance/cli.mjs'), 'check'], {
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
    timeout: 900000
  })
)
const bundles = []
for (const source of [...new Set(report.entries.filter(e => e.eligible).map(e => e.source))]) {
  const remotes = [],
    upstreams = {}
  try {
    for (const entry of report.entries.filter(e => e.source === source && e.eligible)) {
      const skill = manifest.skills.find(s => s.name === entry.name)
      const remote = fetchSource(source, entry.upstreamCommit)
      remotes.push(remote)
      upstreams[entry.name] = { commit: remote.commit, tree: remote.tree(skill.path) }
    }
    const unit = join(destination, source.replace('/', '--'))
    prepare(root, manifest, report, upstreams, unit, source)
    const entries = report.entries
      .filter(e => e.source === source && e.eligible)
      .map(e => ({ ...e, tree: readTree(join(unit, '.agents/skills', e.name)) }))
    bundles.push({
      source,
      entries,
      digest: sha256(JSON.stringify(entries.map(e => [e.name, e.upstreamCommit, treeDigest(e.tree)])))
    })
  } finally {
    for (const remote of remotes) remote.close()
  }
}
mkdirSync(destination, { recursive: true })
writeFileSync(join(destination, 'report.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' })
writeFileSync(
  join(destination, 'bundles.json'),
  JSON.stringify(
    {
      version: 1,
      baseSha: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
      manifestDigest: sha256(JSON.stringify(manifest)),
      bundles
    },
    null,
    2
  ) + '\n',
  { flag: 'wx' }
)
console.log(
  JSON.stringify({
    candidateSources: bundles.length,
    held: report.entries.filter(e => ['held', 'unmapped', 'path-missing'].includes(e.status)).length,
    destination
  })
)
