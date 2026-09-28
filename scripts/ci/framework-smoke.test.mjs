import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { test } from 'node:test'

import { WebSocketServer } from 'ws'

import { verifyFramework } from '../release/framework-smoke.mjs'

async function fixture(t, { protectedStatus = 401, closeCode = 4401 } = {}) {
  const server = createServer((request, response) => {
    if (request.url === '/') return response.end('<html><body>Fixture</body></html>')
    if (request.url === '/api/v1/health') return response.end('{"status":"ok"}')
    if (request.url === '/api/auth/get-session') return response.end('null')
    response.statusCode = protectedStatus
    response.end('{}')
  })
  const sockets = new WebSocketServer({ server, path: '/ws' })
  sockets.on('connection', socket => socket.close(closeCode))
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  t.after(async () => {
    for (const client of sockets.clients) client.terminate()
    await new Promise(resolve => sockets.close(resolve))
    server.closeAllConnections()
    await new Promise(resolve => server.close(resolve))
  })
  return `http://127.0.0.1:${server.address().port}`
}

test('deployment probe checks page, HTTP and real WebSocket responses', async t => {
  await verifyFramework(await fixture(t))
})

test('deployment probe fails when anonymous HTTP access becomes allowed', async t => {
  await assert.rejects(verifyFramework(await fixture(t, { protectedStatus: 200 })), /Protected HTTP/)
})

test('deployment probe fails on a non-authentication WebSocket close', async t => {
  await assert.rejects(verifyFramework(await fixture(t, { closeCode: 1011 })), /expected 4401/)
})
