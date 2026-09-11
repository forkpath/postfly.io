import { ConfigModule, ConfigService } from '@nestjs/config'
import { Test } from '@nestjs/testing'

import { describe, expect, it, vi } from 'vitest'

import { SmsModule, SmsService } from './index'

const mock = vi.hoisted(() => ({ send: vi.fn() }))
vi.mock('@alicloud/dysmsapi20170525', () => ({
  default: class Client {
    sendSms = mock.send
  },
  SendSmsRequest: class Request {}
}))

describe('optional SMS adapter', () => {
  const sms = { accessKeyId: 'test', accessKeySecret: 'test', signName: 'Ray' }

  it('resolves through Nest and sends the configured signature and template', async () => {
    mock.send.mockResolvedValue({ body: { code: 'OK' } })
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ ignoreEnvFile: true, load: [() => ({ sms })] }), SmsModule.register()]
    }).compile()
    await module.get(SmsService).send('15500000000', 'template-test', '{"code":"123456"}')
    expect(mock.send).toHaveBeenLastCalledWith(
      expect.objectContaining({
        phoneNumbers: '15500000000',
        signName: 'Ray',
        templateCode: 'template-test',
        templateParam: '{"code":"123456"}'
      })
    )
    await module.close()
  })

  it('surfaces provider rejection instead of reporting a delivered SMS', async () => {
    mock.send.mockResolvedValue({ body: { code: 'isv.BUSINESS_LIMIT_CONTROL' } })
    await expect(new SmsService(new ConfigService({ sms })).send('15500000000', 't', '{}')).rejects.toThrow(
      'BUSINESS_LIMIT_CONTROL'
    )
  })

  it('fails clearly if the optional module is enabled without configuration', () => {
    expect(() => new SmsService(new ConfigService({ sms: { ...sms, signName: '' } }))).toThrow('SMS requires')
  })
})
