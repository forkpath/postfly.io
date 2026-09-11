import { afterEach, expect, it, vi } from 'vitest'

import { EmailTemplate } from '@libs/email'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.resetModules()
})

it('can import the server interface without requiring sender credentials', async () => {
  vi.stubEnv('EMAIL_FROM', undefined)
  vi.stubEnv('RESEND_API_KEY', undefined)
  const entry = await import('./index')
  expect(entry.sendEmail).toBeTypeOf('function')
  expect(entry.sendRawEmail).toBeTypeOf('function')
})

it('preserves raw sender payload and propagates provider rejection', async () => {
  vi.stubEnv('EMAIL_FROM', 'sender@example.test')
  vi.stubEnv('RESEND_API_KEY', 'test-key')
  const fetchMock = vi.fn().mockResolvedValue({ ok: true })
  vi.stubGlobal('fetch', fetchMock)
  const { sendRawEmail } = await import('./index')
  await sendRawEmail({ to: 'user@example.test', subject: 'test', text: 'hello' })
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
    from: 'sender@example.test',
    to: 'user@example.test',
    subject: 'test',
    text: 'hello'
  })
  fetchMock.mockResolvedValueOnce({ ok: false, status: 503, statusText: 'Unavailable' })
  await expect(sendRawEmail({ to: 'user@example.test', subject: 'test', text: 'hello' })).rejects.toThrow('503')
})

it('renders the existing OTP template before sending HTML and plain text', async () => {
  vi.stubEnv('EMAIL_FROM', 'sender@example.test')
  vi.stubEnv('RESEND_API_KEY', 'test-key')
  const fetchMock = vi.fn().mockResolvedValue({ ok: true })
  vi.stubGlobal('fetch', fetchMock)
  const { sendEmail } = await import('./index')
  await sendEmail({
    to: 'user@example.test',
    template: EmailTemplate.SIGN_IN_OTP,
    variables: { otp: '451923' },
    locale: 'en'
  })
  const body = JSON.parse(fetchMock.mock.calls[0][1].body)
  expect(body.html).toContain('451923')
  expect(body.text).toContain('451923')
  expect(body.subject).toBeTruthy()
})
