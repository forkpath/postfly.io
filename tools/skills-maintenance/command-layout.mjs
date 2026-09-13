import { cpSync, lstatSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

export const LEGACY_COMMAND_PATHS = Object.freeze(['.agents/commands', '.codex/commands'])

export function assertNoLegacyCommands(root) {
  for (const path of LEGACY_COMMAND_PATHS) {
    try {
      lstatSync(join(root, path))
    } catch (error) {
      if (error.code === 'ENOENT') continue
      throw error
    }
    throw new Error('Retired command directory must not exist: ' + path)
  }
}

// Only called on a freshly extracted baseline archive, never the source workspace.
export function overlayCursorCommands(source, destination) {
  const commands = join(source, '.cursor/commands')
  if (!lstatSync(commands).isDirectory() || lstatSync(commands).isSymbolicLink())
    throw new Error('Cursor commands must be a real directory')
  for (const name of readdirSync(commands)) {
    const stat = lstatSync(join(commands, name))
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('Cursor command must be a regular file: ' + name)
  }
  // Remove the archived Cursor symlink before copying, so cp cannot follow it.
  for (const path of [...LEGACY_COMMAND_PATHS, '.cursor/commands'])
    rmSync(join(destination, path), { recursive: true, force: true })
  cpSync(commands, join(destination, '.cursor/commands'), { recursive: true })
}
