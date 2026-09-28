import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'

export async function verifyFramework(baseUrl, { apiBaseUrl = baseUrl, pulseBaseUrl = baseUrl } = {}) {
  const origin = new URL(baseUrl)
  if (!['https:', 'http:'].includes(origin.protocol)) throw new Error('SMOKE_BASE_URL must use HTTP(S)')
  async function get(path) {
    const response = await fetch(new URL(path, path === '/' ? origin : apiBaseUrl), {
      signal: AbortSignal.timeout(10_000)
    })
    assert.equal(response.ok, true, `${path}: HTTP ${response.status}`)
    return response
  }
  assert.match(await (await get('/')).text(), /<html[\s>]/i, 'The production page must return HTML')
  await get('/api/v1/health')
  assert.equal(await (await get('/api/auth/get-session')).json(), null, 'A request without cookies must be signed out')
  const protectedResponse = await fetch(new URL('/api/v1/billing/me', apiBaseUrl), {
    signal: AbortSignal.timeout(10_000)
  })
  assert.equal(protectedResponse.status, 401, 'Protected HTTP routes must reject anonymous access')

  const socketUrl = new URL('/ws', pulseBaseUrl)
  socketUrl.protocol = socketUrl.protocol === 'https:' ? 'wss:' : 'ws:'
  await new Promise((resolve, reject) => {
    const socket = new WebSocket(socketUrl)
    const timer = setTimeout(() => {
      socket.close()
      reject(new Error('Anonymous WebSocket rejection timed out'))
    }, 10_000)
    socket.addEventListener(
      'error',
      () => {
        clearTimeout(timer)
        reject(new Error('Could not reach the WebSocket authentication boundary'))
      },
      { once: true }
    )
    socket.addEventListener(
      'close',
      event => {
        clearTimeout(timer)
        if (event.code === 4401) resolve()
        else reject(new Error(`Anonymous WebSocket closed with ${event.code}, expected 4401`))
      },
      { once: true }
    )
  })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (!process.env.SMOKE_BASE_URL) throw new Error('SMOKE_BASE_URL is required')
  await verifyFramework(process.env.SMOKE_BASE_URL, {
    apiBaseUrl: process.env.SMOKE_API_BASE_URL,
    pulseBaseUrl: process.env.SMOKE_PULSE_BASE_URL
  })
  console.log('Framework page, health, HTTP session and WebSocket authentication boundaries passed')
}
