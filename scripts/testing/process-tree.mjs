import { execFileSync } from 'node:child_process'

// Gradle and native compilers may create another process group. Enumerate only
// descendants of this run's child, never stop globally named daemons/devices.
export function terminateProcessTree(pid, signal = 'SIGTERM') {
  const rows = execFileSync('ps', ['-axo', 'pid=,ppid='], { encoding: 'utf8', timeout: 5_000 })
    .trim()
    .split('\n')
    .map(row => row.trim().split(/\s+/).map(Number))
  const owned = new Set([pid])
  let changed = true
  while (changed) {
    changed = false
    for (const [child, parent] of rows) {
      if (owned.has(parent) && !owned.has(child)) {
        owned.add(child)
        changed = true
      }
    }
  }
  for (const child of [...owned].reverse()) {
    try {
      process.kill(child, signal)
    } catch (error) {
      if (error.code !== 'ESRCH') throw error
    }
  }
}
