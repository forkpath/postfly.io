import { Test } from '@nestjs/testing'

import { describe, expect, it, vi } from 'vitest'

import { EmailModule, EmailService } from './index'

describe('optional email adapter', () => {
  it('injects a raw sender and preserves subject/body without template conversion', async () => {
    const sender = vi.fn().mockResolvedValue(undefined)
    const module = await Test.createTestingModule({ imports: [EmailModule.register(sender)] }).compile()
    const service = module.get(EmailService)
    const args = { to: 'test@example.test', subject: 'Framework test', text: 'Hello' }
    await service.send(args)
    expect(sender).toHaveBeenCalledExactlyOnceWith(args)
    await module.close()
  })

  it('does not initialize provider credentials when registering the default sender', async () => {
    const module = await Test.createTestingModule({ imports: [EmailModule.register()] }).compile()
    expect(module.get(EmailService)).toBeInstanceOf(EmailService)
    await module.close()
  })

  it('rejects missing content before sending and propagates provider errors', async () => {
    const sender = vi.fn().mockRejectedValue(new Error('provider offline'))
    const service = new EmailService(sender)
    await expect(service.send({ to: 'a@example.test', subject: 'x' })).rejects.toThrow('Either html or text')
    expect(sender).not.toHaveBeenCalled()
    await expect(service.send({ to: 'a@example.test', subject: 'x', html: '<p>x</p>' })).rejects.toThrow(
      'provider offline'
    )
  })
})
