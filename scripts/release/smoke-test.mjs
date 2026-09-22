const baseUrl = process.env.SMOKE_BASE_URL ?? 'http://localhost:8080'
const email = process.env.SMOKE_EMAIL
const password = process.env.SMOKE_PASSWORD
const organizationId = process.env.SMOKE_ORGANIZATION_ID

if (!email || !password) {
  throw new Error('SMOKE_EMAIL and SMOKE_PASSWORD are required')
}

async function expectOk(path, init = {}) {
  const response = await fetch(new URL(path, baseUrl), init)
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`${init.method ?? 'GET'} ${path} failed (${response.status}): ${body.slice(0, 500)}`)
  }
  return response
}

await expectOk('/api/v1/health')

const signIn = await expectOk('/api/auth/sign-in/email', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email, password })
})
const cookies = signIn.headers
  .getSetCookie()
  .map(value => value.split(';', 1)[0])
  .join('; ')
if (!cookies) throw new Error('sign-in returned no session cookie')

const authenticated = { headers: { cookie: cookies } }
const session = await (await expectOk('/api/auth/get-session', authenticated)).json()
if (!session?.user?.id) throw new Error('authenticated session is missing user.id')

await expectOk('/api/v1/billing/me', authenticated)
await expectOk('/api/auth/organization/list', authenticated)

if (organizationId && process.env.ORGANIZATION_BILLING_ENABLED === 'true') {
  await expectOk(`/api/v1/organizations/${encodeURIComponent(organizationId)}/billing`, authenticated)
}

console.log('Auth, billing, and organization smoke tests passed')
