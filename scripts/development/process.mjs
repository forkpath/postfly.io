import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'

import { root } from './config.mjs'

export function redact(text, env) {
  let result = text
  for (const [key, value] of Object.entries(env)) {
    if (value && /PASSWORD|SECRET|TOKEN|API_KEY|DATABASE_URL|RABBITMQ_URI/.test(key)) {
      result = result.replaceAll(value, '[redacted]')
    }
  }
  return result
}

export function run(command, args, { env = process.env, cwd = root, capture = false, signal, timeout = 600_000 } = {}) {
  signal?.throwIfAborted()
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      detached: process.platform !== 'win32',
      stdio: ['ignore', 'pipe', 'pipe']
    })
    let output = ''
    let killTimer
    function kill(signalName) {
      if (!child.pid) return
      try {
        if (process.platform === 'win32') child.kill(signalName)
        else process.kill(-child.pid, signalName)
      } catch {
        /* process group already exited */
      }
    }
    function stop() {
      kill('SIGTERM')
      killTimer ??= setTimeout(() => kill('SIGKILL'), 5_000)
    }
    const timer = timeout ? setTimeout(stop, timeout) : undefined
    signal?.addEventListener('abort', stop, { once: true })
    for (const stream of [child.stdout, child.stderr]) {
      const lines = createInterface({ input: stream })
      lines.on('line', line => {
        if (capture) {
          if (stream === child.stdout) output += `${line}\n`
        } else console.log(redact(line, env))
      })
    }
    function cleanup() {
      clearTimeout(timer)
      clearTimeout(killTimer)
      signal?.removeEventListener('abort', stop)
    }
    child.once('error', error => {
      cleanup()
      reject(new Error(`Cannot start ${command}: ${error.code}`))
    })
    child.once('close', (code, exitSignal) => {
      // The leader may exit before descendants. Finish stopping the owned group
      // before clearing the escalation timer or returning to the caller.
      if (killTimer) kill('SIGKILL')
      cleanup()
      if (code === 0 && !signal?.aborted && !killTimer) resolve(output.trim())
      else reject(new Error(`${command} ${args[0]} failed (${exitSignal ?? code})`))
    })
  })
}
