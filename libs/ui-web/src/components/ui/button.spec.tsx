import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Button } from './button'

describe('Button', () => {
  it('forwards clicks and suppresses the action when disabled', () => {
    const onClick = vi.fn()
    const { rerender } = render(<Button onClick={onClick}>Save</Button>)
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onClick).toHaveBeenCalledTimes(1)
    rerender(
      <Button disabled onClick={onClick}>
        Save
      </Button>
    )
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('composes a link without adding a nested button', () => {
    render(
      <Button asChild variant="link">
        <a href="/help">Help</a>
      </Button>
    )
    expect(screen.getByRole('link', { name: 'Help' }).getAttribute('href')).toBe('/help')
    expect(screen.queryByRole('button')).toBeNull()
  })
})
