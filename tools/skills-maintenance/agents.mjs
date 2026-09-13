// The repository supports exactly these coding Agent entry points.
import { lstatSync } from 'node:fs'
import { join } from 'node:path'

export const SUPPORTED_AGENTS = Object.freeze(['codex', 'cursor'])
export const AGENT_DIRECTORIES = Object.freeze(SUPPORTED_AGENTS.map(agent => '.' + agent))
// Deny/cleanup targets only; these never receive synchronized content.
export const RETIRED_AGENT_PATHS = Object.freeze(['.claude', 'CLAUDE.md'])

export function assertSupportedAgent(agent) {
  if (!SUPPORTED_AGENTS.includes(agent)) throw new Error('Unsupported Agent: ' + agent)
}

export function assertNoRetiredEntries(root) {
  for (const path of RETIRED_AGENT_PATHS) {
    try {
      lstatSync(join(root, path))
    } catch (error) {
      if (error.code === 'ENOENT') continue
      throw error
    }
    throw new Error('Retired Agent entry must not exist: ' + path)
  }
}
