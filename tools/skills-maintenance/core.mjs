// 技能维护核心：读取不执行上游内容；所有落盘需显式调用准备/同步。
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative } from 'node:path'

import { AGENT_DIRECTORIES, assertNoRetiredEntries } from './agents.mjs'
import { assertNoLegacyCommands } from './command-layout.mjs'

export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')
export function safePath(value) {
  if (
    typeof value !== 'string' ||
    !value ||
    value.startsWith('/') ||
    value.includes('\\') ||
    value.split('/').some(p => !p || p === '..' || p === '.') ||
    [...value].some(c => c.charCodeAt(0) < 32)
  )
    throw new Error('Unsafe relative path: ' + value)
  return value
}
export function readTree(root) {
  const result = {}
  function walk(dir, prefix = '') {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
      const name = prefix + entry.name
      safePath(name)
      const path = join(dir, entry.name)
      if (entry.isSymbolicLink()) throw new Error('Content symlink rejected: ' + path)
      if (entry.isDirectory()) walk(path, name + '/')
      else if (entry.isFile()) {
        const bytes = readFileSync(path)
        if (bytes.length > 4 * 1024 * 1024) throw new Error('Oversized skill file: ' + name)
        result[name] = { bytes: bytes.toString('base64'), executable: Boolean(lstatSync(path).mode & 0o111) }
      } else throw new Error('Unsupported file: ' + path)
    }
  }
  if (lstatSync(root).isSymbolicLink()) throw new Error('Canonical content must not be a symlink')
  walk(root)
  return result
}
export function treeDigest(tree) {
  return sha256(
    JSON.stringify(
      Object.keys(tree)
        .sort()
        .map(name => [name, tree[name].executable, sha256(Buffer.from(tree[name].bytes, 'base64'))])
    )
  )
}
// Compatible with vercel-labs/skills d667282 src/local-lock.ts; not a version pin.
export function legacyDigest(tree) {
  const hash = createHash('sha256')
  for (const path of Object.keys(tree).sort((a, b) => a.localeCompare(b))) {
    hash.update(path)
    hash.update(Buffer.from(tree[path].bytes, 'base64'))
  }
  return hash.digest('hex')
}
export function treeDiff(before, after) {
  return [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .sort()
    .filter(name => JSON.stringify(before[name]) !== JSON.stringify(after[name]))
    .map(name => ({ path: name, status: !before[name] ? 'added' : !after[name] ? 'deleted' : 'modified' }))
}
export function validateManifest(manifest) {
  if (manifest.version !== 1 || !Array.isArray(manifest.skills)) throw new Error('Invalid governance manifest')
  const names = new Set()
  for (const skill of manifest.skills) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(skill.name) || skill.name.startsWith('ray-') || names.has(skill.name))
      throw new Error('Invalid, duplicate or custom external skill: ' + skill.name)
    names.add(skill.name)
    if (!/^[\w.-]+\/[\w.-]+$/.test(skill.source)) throw new Error('Invalid GitHub source')
    if (skill.path !== null) safePath(skill.path)
    else if (skill.localState !== 'unknown') throw new Error('Unmapped source must be unknown')
    if (!/^[a-f0-9]{40}$/.test(skill.observedCommit) || !/^[a-f0-9]{64}$/.test(skill.installedDigest))
      throw new Error('Missing immutable source/digest')
    if (
      !['matched', 'diverged', 'unknown'].includes(skill.localState) ||
      typeof skill.reason !== 'string' ||
      !skill.reason
    )
      throw new Error('Missing local provenance review')
  }
}
export function assess(skill, local, upstream) {
  if (treeDigest(local) !== skill.installedDigest)
    return { status: 'local-conflict', eligible: false, reason: 'Installed content changed since reviewed digest' }
  if (!upstream) return { status: 'source-unavailable', eligible: false, reason: 'Source unavailable' }
  if (!upstream.tree)
    return {
      status: 'path-missing',
      eligible: false,
      reason: 'Upstream deleted or moved path; manual provenance required'
    }
  const candidateEntry = upstream.tree['SKILL.md']
  const candidateText = candidateEntry ? Buffer.from(candidateEntry.bytes, 'base64').toString('utf8') : ''
  const header = candidateText.match(/^---\n([\s\S]*?)\n---(?:\n|$)/)?.[1]
  if (
    !header ||
    !header.split('\n').some(line => line === 'name: ' + skill.name) ||
    !/^description:\s*\S/m.test(header)
  )
    return { status: 'held', eligible: false, reason: 'Candidate SKILL.md missing, renamed, or invalid metadata' }
  const changes = treeDiff(local, upstream.tree)
  const digest = treeDigest(upstream.tree)
  if (!changes.length) return { status: 'unchanged', eligible: false, candidateDigest: digest, changes }
  const risky = changes.filter(({ path }) => !/\.(md|txt)$/i.test(path) || upstream.tree[path]?.executable)
  const content = Object.values(upstream.tree)
    .map(f => Buffer.from(f.bytes, 'base64').toString('utf8'))
    .join('\n')
  const hazards = ['curl', 'wget', 'npx', 'latest', 'sudo', 'token', 'secret', 'license'].filter(word =>
    new RegExp('\\b' + word + '\\b', 'i').test(content)
  )
  const eligible = skill.localState === 'matched' && skill.review === 'compatible' && risky.length === 0
  return {
    status: eligible ? 'candidate' : 'held',
    eligible,
    candidateDigest: digest,
    changes,
    risky,
    hazards,
    reason: eligible
      ? 'Documentation-only candidate; human compatibility and behavior review still required'
      : 'Local divergence, compatibility hold, or non-document changes require review'
  }
}
export function checkEntry(root, skill, upstream) {
  const local = readTree(join(root, '.agents/skills', skill.name))
  if (treeDigest(local) !== skill.installedDigest)
    return {
      name: skill.name,
      source: skill.source,
      status: 'local-conflict',
      eligible: false,
      reason: 'Installed content changed since reviewed digest'
    }
  if (skill.path === null)
    return {
      name: skill.name,
      source: skill.source,
      path: null,
      status: 'unmapped',
      eligible: false,
      reason: skill.reason
    }
  return {
    name: skill.name,
    source: skill.source,
    path: skill.path,
    upstreamCommit: upstream?.commit ?? null,
    ...assess(skill, local, upstream)
  }
}
export function writeTree(destination, tree) {
  if (existsSync(destination)) throw new Error('Destination exists: ' + destination)
  // Validate the complete tree before creating anything.
  for (const [name, file] of Object.entries(tree)) {
    safePath(name)
    if (typeof file.bytes !== 'string' || typeof file.executable !== 'boolean') throw new Error('Malformed tree')
  }
  mkdirSync(destination, { recursive: true })
  for (const [name, file] of Object.entries(tree)) {
    const path = join(destination, name)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, Buffer.from(file.bytes, 'base64'), { flag: 'wx', mode: file.executable ? 0o755 : 0o644 })
  }
}
export function prepare(root, manifest, report, upstreams, destination, source) {
  validateManifest(manifest)
  if (!/^[\w.-]+\/[\w.-]+$/.test(source)) throw new Error('Explicit source required')
  if (report.manifestDigest !== sha256(JSON.stringify(manifest))) throw new Error('Manifest digest mismatch')
  if (existsSync(destination)) throw new Error('Destination exists; no overwrite')
  const entries = report.entries.filter(e => e.source === source && e.eligible)
  if (!entries.length) throw new Error('No eligible candidate for source')
  const trees = []
  // Atomic preflight: no workspace changes and no partial candidate on digest conflicts.
  for (const entry of entries) {
    const skill = manifest.skills.find(s => s.name === entry.name)
    if (!skill || skill.source !== source) throw new Error('Report source/name not governed')
    const upstream = upstreams[entry.name]
    const checked = checkEntry(root, skill, upstream)
    if (
      !checked.eligible ||
      checked.upstreamCommit !== entry.upstreamCommit ||
      checked.candidateDigest !== entry.candidateDigest
    )
      throw new Error('Candidate changed or digest mismatch: ' + entry.name)
    trees.push([entry.name, upstream.tree])
  }
  mkdirSync(destination, { recursive: true })
  for (const [name, tree] of trees) writeTree(join(destination, '.agents/skills', name), tree)
  writeFileSync(
    join(destination, 'candidate.json'),
    JSON.stringify({ version: 1, source, manifestDigest: report.manifestDigest, entries }, null, 2) + '\n',
    { flag: 'wx' }
  )
  return entries
}
export function syncSkills(root, apply = false) {
  if (typeof apply !== 'boolean') throw new Error('Sync apply must be boolean; only skills are synchronized')
  assertNoRetiredEntries(root)
  assertNoLegacyCommands(root)
  const kind = 'skills'
  const canonical = join(root, '.agents', kind)
  for (const path of [join(root, '.agents'), canonical])
    if (lstatSync(path).isSymbolicLink()) throw new Error('Canonical directory symlink: ' + path)
  for (const name of readdirSync(canonical))
    if (lstatSync(join(canonical, name)).isSymbolicLink()) throw new Error('Canonical entry symlink: ' + name)
  const names = readdirSync(canonical)
    .filter(name => lstatSync(join(canonical, name)).isDirectory())
    .sort()
  const pending = [],
    errors = []
  for (const agent of AGENT_DIRECTORIES) {
    if (existsSync(join(root, agent)) && lstatSync(join(root, agent)).isSymbolicLink())
      throw new Error('Agent root symlink: ' + agent)
    const parent = join(root, agent, kind)
    if (existsSync(parent) && lstatSync(parent).isSymbolicLink()) errors.push('Agent directory symlink: ' + parent)
    const existing = existsSync(parent) ? readdirSync(parent) : []
    for (const name of existing) if (!names.includes(name)) errors.push('Unknown agent entry: ' + join(parent, name))
    for (const name of names) {
      const path = join(parent, name),
        expected = '../../.agents/' + kind + '/' + name
      let stat
      try {
        stat = lstatSync(path)
      } catch (error) {
        if (error.code !== 'ENOENT') throw error
      }
      if (!stat) pending.push({ path, target: expected })
      else if (
        !stat.isSymbolicLink() ||
        readlinkSync(path) !== expected ||
        !existsSync(path) ||
        realpathSync(path) !== realpathSync(join(canonical, name))
      )
        errors.push('Conflicting entry: ' + path)
    }
  }
  if (errors.length) throw new Error(errors.join('\n'))
  if (apply)
    for (const item of pending) {
      mkdirSync(dirname(item.path), { recursive: true })
      symlinkSync(item.target, item.path)
    }
  return { kind, missing: apply ? [] : pending.map(x => relative(root, x.path)), created: apply ? pending.length : 0 }
}
export function fetchSource(source, ref = 'HEAD') {
  if (!/^[\w.-]+\/[\w.-]+$/.test(source) || !(ref === 'HEAD' || /^[a-f0-9]{40}$/.test(ref)))
    throw new Error('Invalid source/ref')
  const temp = mkdtempSync(join(tmpdir(), 'ray-skills-source-'))
  const env = {
    PATH: process.env.PATH,
    LC_ALL: 'C',
    GIT_TERMINAL_PROMPT: '0',
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: '/dev/null'
  }
  const git = args =>
    execFileSync('git', ['-c', 'credential.helper=', '-c', 'core.hooksPath=/dev/null', ...args], {
      cwd: temp,
      env,
      encoding: 'utf8',
      timeout: 90000,
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe']
    })
  try {
    git(['init', '--quiet'])
    git(['fetch', '--quiet', '--depth=1', 'https://github.com/' + source + '.git', ref])
    const commit = git(['rev-parse', 'FETCH_HEAD']).trim()
    const listing = git(['ls-tree', '-r', '-z', commit]).split('\0').filter(Boolean)
    return {
      commit,
      paths: listing.map(line => line.split('\t')[1]),
      read(path) {
        safePath(path)
        return git(['show', commit + ':' + path])
      },
      tree(path) {
        safePath(path)
        const tree = {}
        for (const line of listing) {
          const [meta, name] = line.split('\t')
          if (!name.startsWith(path + '/')) continue
          const [mode, type, oid] = meta.split(' ')
          if (type !== 'blob' || !['100644', '100755'].includes(mode))
            throw new Error('Unsupported upstream entry: ' + name)
          const bytes = execFileSync('git', ['cat-file', 'blob', oid], {
            cwd: temp,
            env,
            timeout: 30000,
            maxBuffer: 4 * 1024 * 1024
          })
          tree[name.slice(path.length + 1)] = { bytes: bytes.toString('base64'), executable: mode === '100755' }
        }
        return tree['SKILL.md'] ? tree : null
      },
      close() {
        rmSync(temp, { recursive: true, force: true })
      }
    }
  } catch (error) {
    rmSync(temp, { recursive: true, force: true })
    throw new Error('Public upstream fetch failed: ' + source, { cause: error })
  }
}
