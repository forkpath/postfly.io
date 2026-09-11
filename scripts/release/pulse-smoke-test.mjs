import WebSocket from 'ws'

const engineUrl = process.env.ENGINE_SMOKE_BASE_URL
const email = process.env.SMOKE_EMAIL
const password = process.env.SMOKE_PASSWORD
const organizationId = process.env.SMOKE_ORGANIZATION_ID

if (!engineUrl || !email || !password) throw new Error('Pulse smoke environment is incomplete')

const signIn = await fetch(new URL('/api/auth/sign-in/email', engineUrl), {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email, password })
})
if (!signIn.ok) throw new Error(`Pulse smoke sign-in failed: ${signIn.status}`)
const cookie = signIn.headers
  .getSetCookie()
  .map(value => value.split(';', 1)[0])
  .join('; ')

function connect(headers = {}) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket('ws://127.0.0.1:3001/ws', { headers })
    const timeout = setTimeout(() => {
      socket.terminate()
      reject(new Error('WebSocket smoke timed out'))
    }, 5000)

    socket.once('error', reject)
    socket.once('message', raw => {
      const message = JSON.parse(raw.toString())
      if (message.type !== 'connected') {
        reject(new Error(`unexpected WebSocket greeting: ${raw.toString()}`))
        return
      }

      if (!organizationId) {
        clearTimeout(timeout)
        socket.close()
        resolve(undefined)
        return
      }

      socket.send(JSON.stringify({ type: 'subscribe', organizationId }))
      socket.once('message', subscription => {
        clearTimeout(timeout)
        const response = JSON.parse(subscription.toString())
        socket.close()
        response.type === 'subscribed'
          ? resolve(undefined)
          : reject(new Error(`organization subscription failed: ${subscription.toString()}`))
      })
    })
  })
}

await connect({ Cookie: cookie })
console.log('Authenticated Pulse WebSocket smoke test passed')
