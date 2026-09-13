// Compare protected tracked files against the confirmed Git tree, without executing them.
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { lstatSync, readFileSync, readlinkSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { assertNoRetiredEntries, RETIRED_AGENT_PATHS } from '../agents.mjs'
import { assertNoLegacyCommands, LEGACY_COMMAND_PATHS } from '../command-layout.mjs'

export function inspectScope(root, workspace) {
  const metadata = JSON.parse(readFileSync(join(workspace, 'EVALUATION-ISOLATION.json'), 'utf8'))
  const policy = JSON.parse(readFileSync(join(root, 'tools/skills-maintenance/sources.json'), 'utf8'))
  if (!policy.baseline.confirmed || metadata.baseline !== policy.baseline.sha) throw new Error('Unconfirmed baseline')
  const retired = JSON.stringify(metadata.retiredAgentPathsRemoved) === JSON.stringify(RETIRED_AGENT_PATHS)
  if (retired) assertNoRetiredEntries(workspace)
  const cursorLocal = metadata.version === 'new' && metadata.commandLayout === 'cursor-local-v1'
  if (cursorLocal) assertNoLegacyCommands(workspace)
  const listing = execFileSync('git', ['ls-tree', '-r', '-z', metadata.baseline], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024
  })
    .split('\0')
    .filter(Boolean)
  const overlay = path =>
    metadata.version === 'new' &&
    ([
      'AGENTS.md',
      // Old evidence has the historical command overlay; do not rewrite its meaning.
      '.agents/commands/setup-saas-feature.md',
      '.cursor/rules/nestjs-clean-typescript-cursor-rules.mdc',
      '.cursor/rules/optimized-react-typescript-best-practices-modern-ui-ux.mdc'
    ].includes(path) ||
      /^\.(agents|codex|cursor)\/skills\/ray-(api-flow|rest-api-flow|websocket-api-flow|module-dev)(\/|$)/.test(path))
  const violations = []
  let checked = 0
  for (const item of listing) {
    const [record, path] = item.split('\t')
    if (retired && RETIRED_AGENT_PATHS.some(entry => path === entry || path.startsWith(entry + '/'))) continue
    if (
      cursorLocal &&
      (LEGACY_COMMAND_PATHS.some(entry => path.startsWith(entry + '/')) || path.startsWith('.cursor/commands/'))
    )
      continue
    if (overlay(path)) continue
    const [mode, type, oid] = record.split(' ')
    if (type !== 'blob') throw new Error('Unsupported baseline entry: ' + path)
    checked++
    try {
      const file = join(workspace, path),
        stat = lstatSync(file)
      const content = stat.isSymbolicLink() ? Buffer.from(readlinkSync(file)) : readFileSync(file)
      const digest = createHash('sha1')
        .update('blob ' + content.length + '\0')
        .update(content)
        .digest('hex')
      const actualMode = stat.isSymbolicLink() ? '120000' : stat.mode & 0o111 ? '100755' : '100644'
      if (digest !== oid || mode !== actualMode) violations.push(path)
    } catch {
      violations.push(path)
    }
  }
  return {
    baseline: metadata.baseline,
    workspace,
    checkedProtectedTrackedFiles: checked,
    violations,
    passed: violations.length === 0,
    limitation:
      'Checks tracked baseline content/modes; does not prove sandbox confinement or inventory every new untracked file.'
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
  const result = inspectScope(root, resolve(process.argv[2] ?? ''))
  console.log(JSON.stringify(result, null, 2))
  if (!result.passed) process.exitCode = 1
}
