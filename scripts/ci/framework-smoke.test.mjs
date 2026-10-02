import assert from 'node:assert/strict'
import { execFileSync, spawn } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { createServer } from 'node:http'
import { createServer as createHttpsServer } from 'node:https'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { test } from 'node:test'

import { WebSocketServer } from 'ws'

import { verifyFramework, waitForGateway } from '../release/framework-smoke.mjs'

async function fixture(
  t,
  { protectedStatus = 401, closeCode = 4401, healthStatuses = [200], onHealth = () => {} } = {}
) {
  let healthRequests = 0
  const server = createServer((request, response) => {
    if (request.url === '/') return response.end('<html><body>Fixture</body></html>')
    if (request.url === '/api/v1/health') {
      onHealth()
      response.statusCode = healthStatuses[Math.min(healthRequests++, healthStatuses.length - 1)]
      return response.end('{"status":"ok"}')
    }
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

const quickReadiness = { timeoutMs: 2_000, intervalMs: 10, requestTimeoutMs: 250, onRetry: () => {} }

test('readiness waits for gateway startup before executing the existing public checks', async t => {
  let requests = 0
  const origin = await fixture(t, { healthStatuses: [503, 502, 200], onHealth: () => requests++ })
  await waitForGateway(origin, quickReadiness)
  assert.equal(requests, 3)
  await verifyFramework(origin)
})

test('the actual deployment command waits for a warming gateway and runs the full probe', async t => {
  const origin = await fixture(t, { healthStatuses: [503, 200] })
  const child = spawn(process.execPath, [resolve('scripts/release/framework-smoke.mjs')], {
    env: { ...process.env, SMOKE_BASE_URL: origin, SMOKE_API_BASE_URL: origin, SMOKE_PULSE_BASE_URL: origin },
    timeout: 15_000
  })
  t.after(() => child.kill())
  let output = ''
  child.stdout.on('data', chunk => {
    output += chunk
  })
  child.stderr.on('data', chunk => {
    output += chunk
  })
  const code = await new Promise((resolve, reject) => {
    child.once('error', reject)
    child.once('exit', resolve)
  })
  assert.equal(code, 0, output)
  assert.match(output, /Waiting for gateway readiness/)
  assert.match(output, /WebSocket authentication boundaries passed/)
})

test('readiness times out on persistent unavailability and rejects configuration errors', async t => {
  await assert.rejects(
    waitForGateway(await fixture(t, { healthStatuses: [503] }), { ...quickReadiness, timeoutMs: 80 }),
    /did not become ready/
  )
  for (const status of [301, 401, 404]) {
    let requests = 0
    const origin = await fixture(t, { healthStatuses: [status], onHealth: () => requests++ })
    await assert.rejects(waitForGateway(origin, quickReadiness), new RegExp(`HTTP ${status}`))
    assert.equal(requests, 1)
  }
  for (const invalid of ['file:///tmp/health', 'https://user:password@example.invalid'])
    await assert.rejects(waitForGateway(invalid, quickReadiness), /HTTP\(S\) origin/)
  await assert.rejects(
    waitForGateway('https://example.invalid', { ...quickReadiness, timeoutMs: 0 }),
    /positive integers/
  )
})

test('successful readiness does not retry or hide broken authorization behavior', async t => {
  const origin = await fixture(t, { protectedStatus: 200 })
  await waitForGateway(origin, quickReadiness)
  await assert.rejects(verifyFramework(origin), /Protected HTTP/)
})

test('an untrusted TLS certificate never passes readiness', async t => {
  const directory = mkdtempSync(join(tmpdir(), 'ray-tls-readiness-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const key = join(directory, 'key.pem')
  const cert = join(directory, 'cert.pem')
  execFileSync(
    'openssl',
    [
      'req',
      '-x509',
      '-newkey',
      'rsa:2048',
      '-nodes',
      '-keyout',
      key,
      '-out',
      cert,
      '-days',
      '1',
      '-subj',
      '/CN=localhost'
    ],
    { stdio: 'ignore' }
  )
  let requests = 0
  const server = createHttpsServer({ key: readFileSync(key), cert: readFileSync(cert) }, (_request, response) => {
    requests++
    response.end('{}')
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  t.after(async () => {
    server.closeAllConnections()
    await new Promise(resolve => server.close(resolve))
  })
  const origin = `https://127.0.0.1:${server.address().port}`
  // Establish the fixture's TLS failure independently: the readiness deadline
  // may abort its final handshake before OpenSSL reports that same error.
  await assert.rejects(fetch(origin, { signal: AbortSignal.timeout(10_000) }), error => {
    assert.equal(error.cause?.code, 'DEPTH_ZERO_SELF_SIGNED_CERT')
    return true
  })
  await assert.rejects(waitForGateway(origin, { ...quickReadiness, timeoutMs: 150 }), /did not become ready/)
  assert.equal(requests, 0)
})
