import assert from 'node:assert/strict'
import { once } from 'node:events'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { test } from 'node:test'

// Exercise the two independently resolved dependencies used by Start's runtime
// and Vite adapter. A plain global Response would miss FastResponse incompatibility.
const start = createRequire(import.meta.resolve('@tanstack/react-start/plugin/vite'))
const plugin = createRequire(start.resolve('@tanstack/start-plugin-core/package.json'))
const runtime = createRequire(plugin.resolve('@tanstack/start-server-core/package.json'))
const { sendNodeResponse } = await import(plugin.resolve('srvx/node'))
const { H3 } = await import(runtime.resolve('h3-v2'))

test('Start runtime responses survive the Vite Node adapter with status and multiple cookies intact', async t => {
  const app = new H3()
    .get('/ok', event => {
      event.res.headers.append('set-cookie', 'first=one; Path=/; HttpOnly')
      event.res.headers.append('set-cookie', 'second=two; Path=/; HttpOnly')
      return { ready: true }
    })
    .get('/unavailable', event => {
      event.res.status = 503
      return { ready: false }
    })
  const server = createServer(async (request, response) => {
    // Vite middleware has already set headers before Start writes its response.
    response.setHeader('x-dev-middleware', 'present')
    try {
      await sendNodeResponse(response, await app.fetch(new Request(`http://localhost${request.url}`)))
    } catch (error) {
      response.statusCode = 599
      response.end(error.name)
    }
  })
  t.after(
    () =>
      new Promise(resolve => {
        server.closeAllConnections()
        server.close(resolve)
      })
  )
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const base = `http://127.0.0.1:${server.address().port}`
  for (const path of ['/ok', '/unavailable', '/ok']) {
    const response = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(5000) })
    assert.equal(response.status, path === '/ok' ? 200 : 503)
    assert.deepEqual(await response.json(), { ready: path === '/ok' })
    if (path === '/ok') {
      assert.deepEqual(response.headers.getSetCookie(), ['first=one; Path=/; HttpOnly', 'second=two; Path=/; HttpOnly'])
    }
  }
})
