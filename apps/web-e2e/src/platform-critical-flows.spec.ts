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
    headers: { Origin: new URL(process.env['BASE_URL'] ?? apiBaseURL).origin },
    data: { email, password, rememberMe: false }
  })
  await expectOk(response, `sign in ${email}`)
}

async function signOut(request: APIRequestContext) {
  const response = await request.post(`${apiBaseURL}/api/auth/sign-out`, {
    headers: { Origin: new URL(process.env['BASE_URL'] ?? apiBaseURL).origin }
  })
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
  // This journey includes animated sections, two sends, tab changes and a viewport change.
  // Keep individual assertions bounded while allowing slower browser engines to complete it.
  test.setTimeout(90_000)
  const response = await page.goto('/')
  expect(response?.ok()).toBe(true)
  await expect(page.locator('h1').first()).toBeVisible()
  const models = page.getByRole('heading', { name: 'LLM Model Selector' }).locator('../..')
  await models.scrollIntoViewIfNeeded()
  await expect(models.getByText('Claude 4 Opus', { exact: true })).toBeVisible()
  await expect(models.getByText('Llama 3.2', { exact: true })).toBeVisible()
  const input = page.getByPlaceholder('Ask Notus AI')
  await input.fill('Create a welcome workflow')
  await input.press('Enter')
  await expect(input).toHaveValue('')
  await expect(page.getByText('Create a welcome workflow', { exact: true })).toBeVisible()
  await input.fill('Add an email step')
  await page.getByRole('button', { name: 'Send demo message' }).click()
  await expect(input).toHaveValue('')
  await expect(page.getByText('Add an email step', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Deploy & Scale' }).click()
  await expect(page.getByText('deploy-dev-eu-324', { exact: true }).first()).toBeVisible()
  await page.getByRole('button', { name: 'Connect your Tools' }).click()
  await expect(page.getByText('deploy-dev-eu-324', { exact: true }).first()).toBeHidden()
  await page.getByRole('button', { name: 'Design your Workflow' }).click()
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(input).toBeVisible()
  await input.fill('Mobile workflow')
  await input.press('Enter')
  await expect(page.getByText('Mobile workflow', { exact: true })).toBeVisible()
})

test.describe('authenticated SaaS critical path', () => {
  test.skip(!ownerEmail || !ownerPassword, 'E2E owner credentials are required')

  test('user sidebar preserves navigation and closes after a mobile selection', async ({ page }) => {
    await signIn(
      page.request,
      requiredEnvironment(ownerEmail, 'E2E_OWNER_EMAIL'),
      requiredEnvironment(ownerPassword, 'E2E_OWNER_PASSWORD')
    )
    await page.goto('/user/profile')
    await expect(page.getByRole('main')).toBeVisible()
    await page.locator('a[href="/user/billing"]:visible').first().click()
    await expect(page).toHaveURL(/\/user\/billing$/)
    await page.getByRole('button', { name: /toggle sidebar/i }).click()
    const userButton = page.locator('[data-slot="sidebar-footer"] button:visible').first()
    await userButton.hover()
    await expect(page.getByRole('menu')).toBeVisible()
    await page.locator('[role="menu"] a[href="/user/security"]').click()
    await expect(page).toHaveURL(/\/user\/security$/)
    await expect(page.getByRole('menu')).toHaveCount(0)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByRole('button', { name: /toggle sidebar/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.locator('[data-slot="sidebar-footer"] button:visible').click()
    await page.screenshot({ path: test.info().outputPath('user-sidebar-mobile.png') })
    await page.getByRole('dialog').locator('a[href="/user/profile"]:visible').click()
    await expect(page).toHaveURL(/\/user\/profile$/)
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await signOut(page.request)
  })

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
    test.skip(
      process.env['E2E_ORGANIZATION_BILLING_ENABLED'] !== 'true',
      'Enable organization billing on the isolated server and opt into this scenario explicitly'
    )
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

test.describe('admin sidebar navigation', () => {
  const adminEmail = process.env['E2E_ADMIN_EMAIL']
  const adminPassword = process.env['E2E_ADMIN_PASSWORD']
  test.skip(!adminEmail || !adminPassword, 'An isolated seeded admin is required')

  test('module navigation remembers a child route across user pages', async ({ page }) => {
    const expectAdminPage = async (pathname: string) => {
      await expect(page).toHaveURL(
        url =>
          url.pathname === pathname && url.searchParams.get('page') === '1' && url.searchParams.get('perPage') === '10'
      )
    }
    await signIn(
      page.request,
      requiredEnvironment(adminEmail, 'E2E_ADMIN_EMAIL'),
      requiredEnvironment(adminPassword, 'E2E_ADMIN_PASSWORD')
    )
    await page.goto('/admin/users')
    await expect(page.getByRole('main')).toBeVisible()
    await page.locator('a[href="/admin/organizations"]:visible').first().click()
    await expectAdminPage('/admin/organizations')
    await page.locator('[data-slot="sidebar-footer"] button:visible').first().click()
    await expect(page).toHaveURL(/\/user\/profile$/)
    await page.locator('[data-slot="sidebar-content"] a[href="/admin"]:visible').click()
    await expectAdminPage('/admin/organizations')
    await page.getByRole('button', { name: /toggle sidebar/i }).click()
    await page.screenshot({ path: test.info().outputPath('admin-sidebar-desktop.png') })
    await page.locator('[data-slot="sidebar-content"] button:visible').first().hover()
    await expect(page.getByRole('menu')).toBeVisible()
    await page.locator('[role="menu"] a[href="/admin/users"]').click()
    await expectAdminPage('/admin/users')
    await expect(page.getByRole('menu')).toHaveCount(0)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByRole('button', { name: /toggle sidebar/i }).click()
    await page.locator('[data-slot="sidebar-content"] button:visible').first().click()
    await page.getByRole('dialog').locator('a[href="/admin/organizations"]:visible').click()
    await expectAdminPage('/admin/organizations')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await signOut(page.request)
  })
})
