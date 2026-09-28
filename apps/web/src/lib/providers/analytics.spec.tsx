import type { ReactNode } from 'react'

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AnalyticsProvider } from './analytics'

const port = vi.hoisted(() => ({ identify: vi.fn(), reset: vi.fn(), useSession: vi.fn() }))
vi.mock('@libs/analytics-web', () => ({ ...port, Provider: ({ children }: { children: ReactNode }) => children }))
vi.mock('@libs/studio', () => ({ authClient: { useSession: port.useSession } }))

describe('AnalyticsProvider session adapter', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders children without changing identity while session is loading', () => {
    port.useSession.mockReturnValue({ isPending: true, data: null })
    render(
      <AnalyticsProvider>
        <p>Application</p>
      </AnalyticsProvider>
    )
    expect(screen.getByText('Application')).toBeTruthy()
    expect(port.identify).not.toHaveBeenCalled()
    expect(port.reset).not.toHaveBeenCalled()
  })

  it('identifies the signed-in user and clears identity on sign-out', () => {
    port.useSession.mockReturnValue({
      isPending: false,
      data: { user: { id: 'test-user', email: 'test@example.invalid', name: 'Test' } }
    })
    const { rerender } = render(<AnalyticsProvider>Application</AnalyticsProvider>)
    expect(port.identify).toHaveBeenCalledWith('test-user', { email: 'test@example.invalid', name: 'Test' })
    port.useSession.mockReturnValue({ isPending: false, data: null })
    rerender(<AnalyticsProvider>Application</AnalyticsProvider>)
    expect(port.reset).toHaveBeenCalledTimes(1)
  })
})
