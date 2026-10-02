import { spawn } from 'node:child_process'
import { once } from 'node:events'

import electron from 'electron'
import { build, createServer } from 'vite'

const watchers = []
let child
let server
let stopping = false
let restartTimer
const ready = new Set()
let restarting = Promise.resolve()

async function stopChild() {
  if (!child || child.exitCode !== null) return
  const previous = child
  child = undefined
  const exited = once(previous, 'exit')
  previous.kill()
  const timer = setTimeout(() => previous.kill('SIGKILL'), 5000)
  await exited
  clearTimeout(timer)
}
function scheduleRestart() {
  clearTimeout(restartTimer)
  restartTimer = setTimeout(() => {
    restarting = restarting
      .then(async () => {
        await stopChild()
        if (stopping) return
        child = spawn(electron, ['.'], {
          stdio: 'inherit',
          env: { ...process.env, DESKTOP_DEV_URL: server.resolvedUrls.local[0] }
        })
        child.on('error', error => {
          console.error(error)
          void shutdown(1)
        })
        child.on('exit', code => {
          if (child && !stopping) void shutdown(code ?? 1)
        })
      })
      .catch(error => {
        console.error(error)
        void shutdown(1)
      })
  }, 150)
}
async function shutdown(code) {
  if (stopping) return
  stopping = true
  clearTimeout(restartTimer)
  await stopChild()
  await Promise.all(watchers.map(watcher => watcher.close()))
  await server?.close()
  process.exit(code)
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => void shutdown(0))
try {
  server = await createServer({ configFile: 'vite.renderer.config.ts' })
  await server.listen()
  server.printUrls()
  // Main clears the shared output directory only before preload's first build.
  for (const name of ['main', 'preload']) {
    const watcher = await build({
      configFile: `vite.${name}.config.ts`,
      mode: 'development',
      build: { watch: {}, emptyOutDir: false }
    })
    watchers.push(watcher)
    await new Promise((resolve, reject) => {
      watcher.on('event', event => {
        if (event.code === 'ERROR') {
          console.error(event.error)
          if (!ready.has(name)) reject(event.error)
        }
        if (event.code === 'END') {
          ready.add(name)
          resolve()
          if (ready.size === 2) scheduleRestart()
        }
      })
    })
  }
} catch (error) {
  console.error(error)
  await shutdown(1)
}
