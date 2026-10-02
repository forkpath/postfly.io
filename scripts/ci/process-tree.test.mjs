import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { test } from 'node:test'

import { terminateProcessTree } from '../testing/process-tree.mjs'

test('device cleanup terminates a detached descendant without stopping unrelated processes', async t => {
  const idle = 'setInterval(() => {}, 1000)'
  const unrelated = spawn(process.execPath, ['-e', idle], { stdio: 'ignore' })
  const parent = spawn(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `
    import { spawn } from 'node:child_process'
    const child = spawn(process.execPath, ['-e', ${JSON.stringify(idle)}], { detached: true, stdio: 'ignore' })
    console.log(child.pid)
    setInterval(() => {}, 1000)
  `
    ],
    { stdio: ['ignore', 'pipe', 'ignore'] }
  )
  let descendant
  t.after(() => {
    for (const pid of [parent.pid, descendant, unrelated.pid]) {
      if (pid)
        try {
          process.kill(pid, 'SIGKILL')
        } catch {
          /* already exited */
        }
    }
  })
  descendant = Number((await once(parent.stdout, 'data'))[0].toString().trim())
  assert.ok(Number.isSafeInteger(descendant) && descendant > 0)
  const ended = once(parent, 'exit')
  terminateProcessTree(parent.pid, 'SIGKILL')
  await ended
  const deadline = Date.now() + 5_000
  while (true) {
    try {
      process.kill(descendant, 0)
    } catch (error) {
      assert.equal(error.code, 'ESRCH')
      break
    }
    assert.ok(Date.now() < deadline, 'detached compiler process survived cleanup')
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  assert.doesNotThrow(() => process.kill(unrelated.pid, 0))
})
