import { useState } from 'react'

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Checkbox } from './checkbox'

function Preferences() {
  const [checked, setChecked] = useState(false)
  return <Checkbox aria-label="Send updates" checked={checked} onCheckedChange={value => setChecked(value === true)} />
}

describe('Checkbox', () => {
  it('exposes the controlled checked state to assistive technology', () => {
    render(<Preferences />)
    const checkbox = screen.getByRole('checkbox', { name: 'Send updates' })
    expect(checkbox.getAttribute('aria-checked')).toBe('false')
    fireEvent.click(checkbox)
    expect(checkbox.getAttribute('aria-checked')).toBe('true')
    fireEvent.click(checkbox)
    expect(checkbox.getAttribute('aria-checked')).toBe('false')
  })

  it('preserves a disabled indeterminate state', () => {
    render(<Checkbox aria-label="Select all" checked="indeterminate" disabled />)
    const checkbox = screen.getByRole('checkbox', { name: 'Select all' })
    fireEvent.click(checkbox)
    expect(checkbox.getAttribute('aria-checked')).toBe('mixed')
    expect(checkbox.hasAttribute('disabled')).toBe(true)
  })
})
