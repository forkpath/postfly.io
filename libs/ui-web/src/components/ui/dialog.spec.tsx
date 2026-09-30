import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Button } from './button'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from './dialog'

describe('Dialog', () => {
  it('opens an accessible dialog, closes with Escape, and restores trigger focus', async () => {
    render(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Edit profile</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>Edit your profile</DialogTitle>
          <DialogDescription>Update the name shown to your team.</DialogDescription>
          <label>
            Name
            <input name="name" />
          </label>
        </DialogContent>
      </Dialog>
    )
    const trigger = screen.getByRole('button', { name: 'Edit profile' })
    fireEvent.click(trigger)
    const dialog = await screen.findByRole('dialog', { name: 'Edit your profile' })
    const descriptionId = dialog.getAttribute('aria-describedby')
    expect(descriptionId && document.getElementById(descriptionId)?.textContent).toBe(
      'Update the name shown to your team.'
    )
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Name' })))
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(trigger))
  })
})
