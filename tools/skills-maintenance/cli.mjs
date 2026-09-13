#!/usr/bin/env node
// 固定由仓库 Node 24 执行；不调用第三方 skills CLI。
import { existsSync, readdirSync, readFileSync, realpathSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { assertNoRetiredEntries } from './agents.mjs'
import { assertNoLegacyCommands } from './command-layout.mjs'
import {
  checkEntry,
  fetchSource,
  prepare,
  readTree,
  sha256,
  syncSkills,
  treeDigest,
  validateManifest
} from './core.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const manifest = JSON.parse(readFileSync(join(root, 'tools/skills-maintenance/sources.json'), 'utf8'))
const [command, ...args] = process.argv.slice(2)
const output = value => console.log(JSON.stringify(value, null, 2))
function option(name) {
  const at = args.indexOf(name)
  if (at < 0 || !args[at + 1]) throw new Error('Required ' + name)
  return args[at + 1]
}
export function validate(root, manifest) {
  assertNoRetiredEntries(root)
  assertNoLegacyCommands(root)
  validateManifest(manifest)
  const names = readdirSync(join(root, '.agents/skills')).sort()
  const externals = names.filter(n => !n.startsWith('ray-'))
  if (JSON.stringify(externals) !== JSON.stringify(manifest.skills.map(s => s.name).sort()))
    throw new Error('External inventory mismatch')
  const expected = ['ray-api-flow', 'ray-module-dev', 'ray-rest-api-flow', 'ray-websocket-api-flow']
  if (JSON.stringify(names.filter(n => n.startsWith('ray-'))) !== JSON.stringify(expected))
    throw new Error('Local skill family mismatch')
  for (const name of names) {
    const tree = readTree(join(root, '.agents/skills', name))
    const entry = tree['SKILL.md']
    if (!entry) throw new Error('Missing SKILL.md: ' + name)
    const text = Buffer.from(entry.bytes, 'base64').toString('utf8')
    const header = text.match(/^---\n([\s\S]*?)\n---(?:\n|$)/)?.[1]
    if (!header || !/^name: .+$/m.test(header) || !/^description:(?: +\S[^\n]*|\n +\S[^\n]*)/m.test(header))
      throw new Error('Invalid metadata: ' + name)
    if (name.startsWith('ray-')) {
      if (!text.includes('name: ' + name + '\n')) throw new Error('Local skill name mismatch')
      for (const [file, value] of Object.entries(tree)) {
        if (!file.endsWith('.md')) continue
        const content = Buffer.from(value.bytes, 'base64').toString()
        for (const match of content.matchAll(/\]\(([^)]+)\)/g)) {
          const link = match[1].split('#')[0]
          if (!link || /^https?:/.test(link)) continue
          const target = resolve(root, '.agents/skills', name, dirname(file), link)
          if (!existsSync(target) || !realpathSync(target).startsWith(realpathSync(root) + '/'))
            throw new Error('Broken/escaping reference: ' + file + ' ' + link)
        }
        if (/\.(?:agents|codex)\/commands\//.test(content)) throw new Error('Obsolete command reference: ' + file)
        for (const match of content.matchAll(/\.\.\/ray-[a-z-]+\/SKILL\.md/g)) {
          const target = resolve(root, '.agents/skills', name, dirname(file), match[0])
          if (!existsSync(target)) throw new Error('Broken routing reference: ' + file + ' ' + match[0])
        }
        if (/as never|as unknown as|\$queryRawUnsafe/.test(content)) throw new Error('Unsafe local example: ' + file)
        if (/from\s+['"]@libs\/(?:auth|billing|srv-core|srv-shared|ui-shared)(?:['"]|\/)/.test(content))
          throw new Error('Obsolete public API in local example: ' + file)
      }
    }
  }
  for (const skill of manifest.skills)
    if (treeDigest(readTree(join(root, '.agents/skills', skill.name))) !== skill.installedDigest)
      throw new Error('Unreviewed installed external change: ' + skill.name)
  return { skills: names.length, external: externals.length, local: expected.length }
}
async function main() {
  validateManifest(manifest)
  if (command === 'validate') {
    output(validate(root, manifest))
    return
  }
  if (command === 'sync' || command === 'sync-check') {
    const result = syncSkills(root, command === 'sync')
    output(result)
    if (command === 'sync-check' && result.missing.length) process.exitCode = 2
    return
  }
  if (command === 'check') {
    const entries = []
    for (const source of [...new Set(manifest.skills.map(s => s.source))]) {
      let remote
      try {
        remote = fetchSource(source)
        for (const skill of manifest.skills.filter(s => s.source === source))
          entries.push(
            checkEntry(root, skill, { commit: remote.commit, tree: skill.path ? remote.tree(skill.path) : null })
          )
      } catch {
        for (const skill of manifest.skills.filter(s => s.source === source))
          entries.push({ name: skill.name, source, status: 'source-unavailable', eligible: false })
      } finally {
        remote?.close()
      }
    }
    output({
      version: 1,
      manifestDigest: sha256(JSON.stringify(manifest)),
      checkedAt: new Date().toISOString(),
      entries
    })
    if (entries.some(e => ['source-unavailable', 'local-conflict'].includes(e.status))) process.exitCode = 2
    return
  }
  if (command === 'prepare') {
    const report = JSON.parse(readFileSync(resolve(option('--report')), 'utf8')),
      source = option('--source'),
      destination = resolve(option('--destination'))
    const upstreams = {},
      remotes = []
    try {
      for (const entry of report.entries.filter(e => e.source === source && e.eligible)) {
        const skill = manifest.skills.find(s => s.name === entry.name && s.source === source)
        if (!skill) throw new Error('Report source/name not governed')
        const remote = fetchSource(source, entry.upstreamCommit)
        remotes.push(remote)
        upstreams[skill.name] = { commit: remote.commit, tree: remote.tree(skill.path) }
      }
      output(prepare(root, manifest, report, upstreams, destination, source))
    } finally {
      for (const remote of remotes) remote.close()
    }
    return
  }
  throw new Error(
    'Usage: cli.mjs validate | check | prepare --report FILE --source OWNER/REPO --destination NEW_DIR | sync-check | sync'
  )
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main().catch(error => {
    console.error(error.message)
    process.exitCode = 1
  })
