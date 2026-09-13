// GitHub 写操作单独启用；候选内容只作为 blob 数据，绝不执行。
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { assess, legacyDigest, readTree, safePath, sha256, treeDigest, validateManifest } from './core.mjs'

export function validateBundle(bundle, manifest, root) {
  if (!bundle.entries?.length || !manifest.skills.some(s => s.source === bundle.source))
    throw new Error('Unknown/empty source bundle')
  const seen = new Set()
  for (const entry of bundle.entries) {
    const skill = manifest.skills.find(s => s.name === entry.name && s.source === bundle.source)
    if (!skill || seen.has(entry.name) || !/^[a-f0-9]{40}$/.test(entry.upstreamCommit))
      throw new Error('Unknown/duplicate candidate')
    seen.add(entry.name)
    for (const path of Object.keys(entry.tree)) safePath(path)
    if (treeDigest(entry.tree) !== entry.candidateDigest) throw new Error('Candidate content digest mismatch')
    if (!assess(skill, readTree(join(root, '.agents/skills', entry.name)), { tree: entry.tree }).eligible)
      throw new Error('Candidate no longer eligible')
  }
  const digest = sha256(JSON.stringify(bundle.entries.map(e => [e.name, e.upstreamCommit, treeDigest(e.tree)])))
  if (digest !== bundle.digest) throw new Error('Source bundle digest mismatch')
  return digest
}
async function main() {
  if (process.env.RAY_SKILLS_PUBLISH !== 'enabled')
    throw new Error('Publishing disabled; this local delivery does not authorize GitHub writes')
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
  const manifest = JSON.parse(readFileSync(join(root, 'tools/skills-maintenance/sources.json'), 'utf8'))
  validateManifest(manifest)
  const data = JSON.parse(readFileSync(process.argv[2], 'utf8'))
  if (data.manifestDigest !== sha256(JSON.stringify(manifest))) throw new Error('Stale manifest')
  const repo = process.env.GITHUB_REPOSITORY,
    token = process.env.GITHUB_TOKEN
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo ?? '') || !token) throw new Error('GitHub repository/token required')
  const api = async (path, method = 'GET', body) => {
    const response = await fetch('https://api.github.com/repos/' + repo + path, {
      method,
      headers: {
        Authorization: 'Bearer ' + token,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30000)
    })
    if (response.status === 404) return null
    if (!response.ok) throw new Error('GitHub request failed ' + response.status + ' ' + method + ' ' + path)
    return response.status === 204 ? null : response.json()
  }
  if (new Set(data.bundles.map(b => b.source)).size !== data.bundles.length) throw new Error('Duplicate source bundles')
  for (const bundle of data.bundles) validateBundle(bundle, manifest, root)
  for (const bundle of data.bundles) {
    const digest = validateBundle(bundle, manifest, root)
    const branch = 'codex/skills-' + bundle.source.replace('/', '--')
    const existing = await api('/git/ref/heads/' + branch)
    const marker = 'Ray skills candidate: ' + bundle.source
    let unchanged = false
    if (existing) {
      const last = await api('/git/commits/' + existing.object.sha)
      if (!last.message.startsWith(marker + '\n'))
        throw new Error('Ref contains non-maintainer commit; refuse overwrite ' + branch)
      unchanged = last.message.includes('Digest: ' + digest)
    }
    const base = await api('/git/ref/heads/dev')
    if (!base) throw new Error('dev branch missing')
    if (base.object.sha !== data.baseSha) throw new Error('dev changed since candidate verification; rerun prepare')
    if (!unchanged) {
      const baseCommit = await api('/git/commits/' + base.object.sha)
      const tree = []
      const nextManifest = structuredClone(manifest)
      const nextLock = JSON.parse(readFileSync(join(root, 'skills-lock.json'), 'utf8'))
      for (const entry of bundle.entries) {
        const local = readTree(join(root, '.agents/skills', entry.name))
        for (const path of new Set([...Object.keys(local), ...Object.keys(entry.tree)])) {
          const file = entry.tree[path]
          const blob = file ? await api('/git/blobs', 'POST', { content: file.bytes, encoding: 'base64' }) : null
          tree.push({
            path: '.agents/skills/' + entry.name + '/' + path,
            mode: '100644',
            type: 'blob',
            sha: blob?.sha ?? null
          })
        }
        const row = nextManifest.skills.find(s => s.name === entry.name)
        nextLock.skills[entry.name] = {
          ...nextLock.skills[entry.name],
          source: bundle.source,
          sourceType: 'github',
          skillPath: row.path + '/SKILL.md',
          ref: entry.upstreamCommit,
          computedHash: legacyDigest(entry.tree)
        }
        Object.assign(row, {
          observedCommit: entry.upstreamCommit,
          installedCommit: entry.upstreamCommit,
          installedDigest: entry.candidateDigest,
          upstreamDigest: entry.candidateDigest,
          localState: 'matched',
          reason: 'Candidate ' + digest + '; human review and bound behavior evidence required before merge'
        })
      }
      const metadata = await api('/git/blobs', 'POST', {
        content: JSON.stringify(nextManifest, null, 2) + '\n',
        encoding: 'utf-8'
      })
      tree.push({ path: 'tools/skills-maintenance/sources.json', mode: '100644', type: 'blob', sha: metadata.sha })
      const lockBlob = await api('/git/blobs', 'POST', {
        content: JSON.stringify(nextLock, null, 2) + '\n',
        encoding: 'utf-8'
      })
      tree.push({ path: 'skills-lock.json', mode: '100644', type: 'blob', sha: lockBlob.sha })
      const built = await api('/git/trees', 'POST', { base_tree: baseCommit.tree.sha, tree })
      const commit = await api('/git/commits', 'POST', {
        message: marker + '\n\nDigest: ' + digest,
        tree: built.sha,
        parents: [base.object.sha]
      })
      if (existing) await api('/git/refs/heads/' + branch, 'PATCH', { sha: commit.sha, force: true })
      else await api('/git/refs', 'POST', { ref: 'refs/heads/' + branch, sha: commit.sha })
    }
    const prs = await api('/pulls?state=open&base=dev&head=' + encodeURIComponent(repo.split('/')[0] + ':' + branch))
    const body =
      'Documentation-only candidate. No runtime dependencies changed.\n\nSource: ' +
      bundle.source +
      '\n\nCandidate digest: ' +
      digest +
      '\n\nHuman compatibility/security/license review and manual Codex/Cursor behavior evidence bound to this digest are required before marking ready or merging. Previous evidence is invalid when this digest changes. No auto-merge.'
    if (prs?.length) await api('/pulls/' + prs[0].number, 'PATCH', { body })
    else
      await api('/pulls', 'POST', {
        title: 'chore(skills): candidate ' + bundle.source,
        head: branch,
        base: 'dev',
        draft: true,
        body
      })
    console.log('Prepared draft PR ' + branch + ' ' + digest)
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main().catch(e => {
    console.error(e.message)
    process.exitCode = 1
  })
