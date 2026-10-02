import { EventEmitter, once } from 'node:events'

import { WebSocket } from 'ws'

export function connect(url: string, cookie = '') {
  const socket = new WebSocket(url.replace('http:', 'ws:') + '/ws', { headers: { cookie } })
  const events = new EventEmitter()
  const messages: unknown[] = []
  let closeCode: number | undefined
  let failure: Error | undefined
  socket.on('message', data => {
    messages.push(JSON.parse(data.toString()))
    events.emit('change')
  })
  socket.on('close', code => {
    closeCode = code
    events.emit('change')
  })
  socket.on('error', error => {
    failure = error
    events.emit('change')
  })

  async function wait<T>(check: () => T | undefined): Promise<T> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5000)
    try {
      for (;;) {
        const result = check()
        if (result !== undefined) return result
        if (failure) throw failure
        await once(events, 'change', { signal: controller.signal })
      }
    } finally {
      clearTimeout(timer)
    }
  }
  return {
    socket,
    send: (message: unknown) => socket.send(JSON.stringify(message)),
    message: () =>
      wait(() => {
        if (messages.length) return messages.shift()
        if (closeCode !== undefined) throw new Error(`Socket closed before expected message: ${closeCode}`)
      }),
    closed: () => wait(() => closeCode),
    async close() {
      if (closeCode !== undefined) return
      if (socket.readyState === WebSocket.CONNECTING) socket.terminate()
      else socket.close()
      await wait(() => closeCode)
    }
  }
}
