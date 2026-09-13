// 首次来源调查；只输出 JSON，不写锁文件或执行上游脚本。
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { fetchSource, readTree, treeDiff, treeDigest } from './core.mjs'

const root = process.cwd()
const lock = JSON.parse(readFileSync(join(root, 'skills-lock.json'), 'utf8'))
const extra = {
  'better-auth-best-practices': 'better-auth/skills',
  'vercel-react-best-practices': 'vercel-labs/agent-skills',
  'web-design-guidelines': 'vercel-labs/agent-skills'
}
const all = readdirSync(join(root, '.agents/skills')).filter(n => !n.startsWith('ray-'))
const sourceArg = process.argv[2]
const names = all.filter(n => (lock.skills[n]?.source ?? extra[n]) === sourceArg)
if (!names.length) throw new Error('Explicit known source required')
const remote = fetchSource(sourceArg)
try {
  const results = names.map(name => {
    const local = readTree(join(root, '.agents/skills', name))
    const candidates = remote.paths
      .filter(
        p =>
          p.endsWith('/SKILL.md') &&
          !/(^|\/)(tests?|fixtures?|examples?)\//.test(p) &&
          (p.split('/').at(-2) === name ||
            (name === 'vercel-react-best-practices' && p.endsWith('/react-best-practices/SKILL.md')) ||
            (name === 'vercel-composition-patterns' && p.endsWith('/composition-patterns/SKILL.md')) ||
            (name === 'better-auth-best-practices' && p === 'better-auth/best-practices/SKILL.md'))
      )
      .map(p => p.slice(0, -9))
    const trees = candidates.map(path => ({ path, tree: remote.tree(path) }))
    const matched = trees.find(t => treeDigest(t.tree) === treeDigest(local))
    const selected = matched ?? trees.find(t => t.path.startsWith('skills/')) ?? trees[0]
    if (!selected)
      return {
        name,
        source: sourceArg,
        observedCommit: remote.commit,
        installedDigest: treeDigest(local),
        status: 'unknown-path',
        candidates: remote.paths.filter(p => p.endsWith('SKILL.md'))
      }
    const text = Object.values(selected.tree)
      .map(f => Buffer.from(f.bytes, 'base64').toString())
      .join('\n')
    return {
      name,
      source: sourceArg,
      path: selected.path,
      observedCommit: remote.commit,
      installedCommit: matched ? remote.commit : null,
      installedDigest: treeDigest(local),
      upstreamDigest: treeDigest(selected.tree),
      localState: matched ? 'matched' : 'diverged',
      review: 'hold',
      reason: matched
        ? 'Exact current upstream content match; compatibility review pending'
        : 'Installed content differs; historical source/local edit attribution not proven',
      licensePaths: remote.paths.filter(p => /(^|\/)(LICENSE|COPYING)(\.|$)/i.test(p)),
      executableFiles: Object.entries(selected.tree)
        .filter(([, v]) => v.executable)
        .map(([k]) => k),
      scripts: Object.keys(selected.tree).filter(p => /\.(mjs|cjs|js|sh|py|ts)$/.test(p)),
      networkLines: text
        .split('\n')
        .filter(l => /https?:|curl |wget |npx |sudo |@latest/.test(l))
        .slice(0, 25),
      changes: treeDiff(local, selected.tree)
    }
  })
  console.log(JSON.stringify(results, null, 2))
} finally {
  remote.close()
}
