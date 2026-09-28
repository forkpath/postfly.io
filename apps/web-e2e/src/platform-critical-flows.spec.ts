import type { APIRequestContext, APIResponse } from '@playwright/test'

import { expect, test } from '@playwright/test'

/* eslint-disable playwright/no-skipped-test -- destructive/provider flows require explicit isolated-environment gates */

const apiBaseURL = process.env['E2E_API_BASE_URL'] ?? 'http://localhost:8000'
const ownerEmail = process.env['E2E_OWNER_EMAIL']
const ownerPassword = process.env['E2E_OWNER_PASSWORD']
const memberEmail = process.env['E2E_MEMBER_EMAIL']
const memberPassword = process.env['E2E_MEMBER_PASSWORD']
const seededOrganizationId = process.env['E2E_ORGANIZATION_ID']

async function expectOk(response: APIResponse, operation: string) {
  expect(response.ok(), `${operation}: ${response.status()} ${await response.text()}`).toBe(true)
}

async function signIn(request: APIRequestContext, email: string, password: string) {
  const response = await request.post(`${apiBaseURL}/api/auth/sign-in/email`, {
    data: { email, password, rememberMe: false }
  })
  await expectOk(response, `sign in ${email}`)
}

async function signOut(request: APIRequestContext) {
  const response = await request.post(`${apiBaseURL}/api/auth/sign-out`)
  await expectOk(response, 'sign out')
}

function organizationIdFrom(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return undefined
  const value = body as { id?: unknown; data?: { id?: unknown } }
  const id = value.id ?? value.data?.id
  return typeof id === 'string' ? id : undefined
}

function requiredEnvironment(value: string | undefined, name: string): string {
  if (!value) throw new Error(`${name} is required for this E2E flow`)
  return value
}

test('marketing application renders from a production build', async ({ page }) => {
  const response = await page.goto('/')
  expect(response?.ok()).toBe(true)
  await expect(page.locator('h1').first()).toBeVisible()
})

test.describe('authenticated SaaS critical path', () => {
  test.skip(!ownerEmail || !ownerPassword, 'E2E owner credentials are required')

  test('login, session, user billing and logout', async ({ request }) => {
    await signIn(
      request,
      requiredEnvironment(ownerEmail, 'E2E_OWNER_EMAIL'),
      requiredEnvironment(ownerPassword, 'E2E_OWNER_PASSWORD')
    )

    const session = await request.get(`${apiBaseURL}/api/auth/get-session`)
    await expectOk(session, 'get session')
    expect((await session.json()) as unknown).toBeTruthy()

    const billing = await request.get(`${apiBaseURL}/api/v1/billing/me`)
    await expectOk(billing, 'get user billing')
    expect(await billing.json()).toMatchObject({ code: 0, data: expect.any(Array) })

    await signOut(request)
    const signedOutSession = await request.get(`${apiBaseURL}/api/auth/get-session`)
    await expectOk(signedOutSession, 'get signed-out session')
    expect(await signedOutSession.json()).toBeNull()
  })

  test('organization create, switch, billing access and cleanup', async ({ request }) => {
    await signIn(
      request,
      requiredEnvironment(ownerEmail, 'E2E_OWNER_EMAIL'),
      requiredEnvironment(ownerPassword, 'E2E_OWNER_PASSWORD')
    )
    const suffix = `${Date.now()}-${test.info().parallelIndex}`
    const slug = `e2e-${suffix}`.slice(0, 32)

    const created = await request.post(`${apiBaseURL}/api/auth/organization/create`, {
      data: { name: `E2E ${suffix}`.slice(0, 32), slug }
    })
    await expectOk(created, 'create organization')
    const organizationId = organizationIdFrom((await created.json()) as unknown)
    expect(organizationId).toBeTruthy()

    try {
      const activated = await request.post(`${apiBaseURL}/api/auth/organization/set-active`, {
        data: { organizationId }
      })
      await expectOk(activated, 'set active organization')

      const summary = await request.get(`${apiBaseURL}/api/v1/organizations/${organizationId}/billing`)
      await expectOk(summary, 'get organization billing')
      expect(await summary.json()).toMatchObject({ code: 0, data: expect.any(Array) })
    } finally {
      const deleted = await request.post(`${apiBaseURL}/api/auth/organization/delete`, {
        data: { organizationId }
      })
      await expectOk(deleted, 'delete organization')
      await signOut(request)
    }
  })

  test('organization invite uses the isolated email mock', async ({ request }) => {
    test.skip(
      !process.env['E2E_INVITEE_EMAIL'] || process.env['E2E_EMAIL_MOCK_ENABLED'] !== 'true',
      'Invitation E2E requires an invitee and the email mock gate'
    )
    await signIn(
      request,
      requiredEnvironment(ownerEmail, 'E2E_OWNER_EMAIL'),
      requiredEnvironment(ownerPassword, 'E2E_OWNER_PASSWORD')
    )
    const suffix = `${Date.now()}-${test.info().parallelIndex}`
    const created = await request.post(`${apiBaseURL}/api/auth/organization/create`, {
      data: { name: `Invite ${suffix}`.slice(0, 32), slug: `invite-${suffix}`.slice(0, 32) }
    })
    await expectOk(created, 'create invitation test organization')
    const organizationId = organizationIdFrom((await created.json()) as unknown)
    expect(organizationId).toBeTruthy()

    try {
      const invitation = await request.post(`${apiBaseURL}/api/auth/organization/invite-member`, {
        data: {
          email: requiredEnvironment(process.env['E2E_INVITEE_EMAIL'], 'E2E_INVITEE_EMAIL'),
          role: 'member',
          organizationId
        }
      })
      await expectOk(invitation, 'invite organization member')
    } finally {
      const deleted = await request.post(`${apiBaseURL}/api/auth/organization/delete`, {
        data: { organizationId }
      })
      await expectOk(deleted, 'delete invitation test organization')
      await signOut(request)
    }
  })

  test('owner creates Stripe organization checkout through the provider mock', async ({ request }) => {
    test.skip(
      !seededOrganizationId ||
        !process.env['E2E_STRIPE_VARIANT_ID'] ||
        process.env['E2E_PROVIDER_MOCK_ENABLED'] !== 'true',
      'Checkout E2E requires a seeded organization, variant and provider mock gate'
    )
    await signIn(
      request,
      requiredEnvironment(ownerEmail, 'E2E_OWNER_EMAIL'),
      requiredEnvironment(ownerPassword, 'E2E_OWNER_PASSWORD')
    )
    const checkout = await request.post(
      `${apiBaseURL}/api/v1/organizations/${requiredEnvironment(seededOrganizationId, 'E2E_ORGANIZATION_ID')}/billing/checkout`,
      {
        data: {
          variantId: requiredEnvironment(process.env['E2E_STRIPE_VARIANT_ID'], 'E2E_STRIPE_VARIANT_ID'),
          successUrl: 'http://localhost:3000/user/billing?checkout=success',
          cancelUrl: 'http://localhost:3000/user/billing?checkout=cancelled'
        }
      }
    )
    await expectOk(checkout, 'create organization checkout')
    expect(checkout.ok()).toBe(true)
    await signOut(request)
  })
})

test.describe('organization member authorization', () => {
  test.skip(
    !memberEmail || !memberPassword || !seededOrganizationId,
    'E2E member credentials and organization are required'
  )

  test('member can read billing but cannot create checkout', async ({ request }) => {
    await signIn(
      request,
      requiredEnvironment(memberEmail, 'E2E_MEMBER_EMAIL'),
      requiredEnvironment(memberPassword, 'E2E_MEMBER_PASSWORD')
    )

    const organizationId = requiredEnvironment(seededOrganizationId, 'E2E_ORGANIZATION_ID')
    const summary = await request.get(`${apiBaseURL}/api/v1/organizations/${organizationId}/billing`)
    await expectOk(summary, 'member reads organization billing')

    const checkout = await request.post(`${apiBaseURL}/api/v1/organizations/${organizationId}/billing/checkout`, {
      data: {
        variantId: process.env['E2E_STRIPE_VARIANT_ID'] ?? 'permission-check-only',
        successUrl: 'http://localhost:3000/user/billing?checkout=success',
        cancelUrl: 'http://localhost:3000/user/billing?checkout=cancelled'
      }
    })
    expect(checkout.status()).toBe(403)
    await signOut(request)
  })
})
