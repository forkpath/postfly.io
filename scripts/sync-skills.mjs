#!/usr/bin/env node
// Keep Codex/Cursor links pointing at the canonical skills. Never overwrite conflicts.
import { existsSync, lstatSync, mkdirSync, readdirSync, readlinkSync, symlinkSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const check = process.argv.includes('--check')
if (process.argv.slice(2).some(arg => arg !== '--check'))
  throw new Error('Usage: node scripts/sync-skills.mjs [--check]')
const canonical = join(root, '.agents/skills')
function stat(path) {
  try {
    return lstatSync(path)
  } catch (error) {
    if (error.code === 'ENOENT') return undefined
    throw error
  }
}
for (const path of [join(root, '.agents'), canonical]) {
  if (!stat(path)?.isDirectory()) throw new Error(`Expected a real directory: ${path}`)
}
const names = readdirSync(canonical)
  .filter(name => {
    const path = join(canonical, name)
    if (stat(path)?.isSymbolicLink()) throw new Error(`Canonical skill cannot be a link: ${path}`)
    return stat(path)?.isDirectory() && existsSync(join(path, 'SKILL.md'))
  })
  .sort()
const pending = []
for (const agent of ['.codex', '.cursor']) {
  const parent = join(root, agent, 'skills')
  for (const path of [join(root, agent), parent]) {
    const entry = stat(path)
    if (entry && !entry.isDirectory()) throw new Error(`Expected a real directory: ${path}`)
  }
  for (const name of existsSync(parent) ? readdirSync(parent) : []) {
    if (!names.includes(name)) throw new Error(`Unknown skill entry: ${join(parent, name)}`)
  }
  for (const name of names) {
    const path = join(parent, name)
    const target = `../../.agents/skills/${name}`
    const entry = stat(path)
    if (!entry) pending.push({ path, target })
    else if (!entry.isSymbolicLink() || readlinkSync(path) !== target || !existsSync(path)) {
      throw new Error(`Conflicting skill entry: ${path}`)
    }
  }
}
// Validate every destination before making any changes.
if (!check)
  for (const { path, target } of pending) {
    mkdirSync(dirname(path), { recursive: true })
    symlinkSync(target, path)
  }
console.log(`${names.length} skills; ${pending.length} links ${check ? 'missing' : 'created'}`)
if (check && pending.length) process.exitCode = 1
