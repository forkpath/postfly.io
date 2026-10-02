import { fork } from 'node:child_process'
import { once } from 'node:events'
import { appendFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../../..')
const reportDir = process.env.RAY_TEST_REPORT_DIR ?? resolve(root, 'dist/test-results/worker/e2e')

export async function startWorkerProcess(crashHandler: boolean) {
  await mkdir(reportDir, { recursive: true })
  const child = fork(resolve(reportDir, 'process/main.js'), [], {
    cwd: root,
    execArgv: [],
    env: {
      ...process.env,
      RAY_TEST_CRASH_HANDLER: String(crashHandler)
    },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc']
  })
  const log = resolve(reportDir, `process-${child.pid}.log`)
  let output = ''
  let writes = Promise.resolve()
  const capture = (chunk: Buffer) => {
    output += chunk.toString()
    writes = writes.then(() => appendFile(log, chunk))
  }
  child.stdout?.on('data', capture)
  child.stderr?.on('data', capture)
  const messages: unknown[] = []
  child.on('message', message => messages.push(message))

  async function waitFor(type: string) {
    const deadline = Date.now() + 30_000
    while (Date.now() < deadline) {
      const message = messages.find(
        value => typeof value === 'object' && value !== null && 'type' in value && value.type === type
      )
      if (message) return message
      if (child.exitCode !== null || child.signalCode !== null) throw new Error(`Worker exited: ${output.slice(-4000)}`)
      await new Promise(resolveTick => setTimeout(resolveTick, 50))
    }
    throw new Error(`Worker did not report ${type}: ${output.slice(-4000)}`)
  }

  async function stop(signal: NodeJS.Signals = 'SIGTERM') {
    if (child.exitCode === null && child.signalCode === null) {
      const exited = once(child, 'exit')
      child.kill(signal)
      const timer = setTimeout(() => child.kill('SIGKILL'), 10_000)
      try {
        await exited
      } finally {
        clearTimeout(timer)
      }
    }
    await writes
  }

  try {
    await waitFor('ready')
    return { waitFor, stop }
  } catch (error) {
    await stop('SIGKILL')
    throw error
  }
}
