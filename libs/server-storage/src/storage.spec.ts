import type { StorageConfig } from './index'

import { describe, expect, it, vi } from 'vitest'

import { createStorageProvider, StorageService } from './index'

const mocks = vi.hoisted(() => ({
  send: vi.fn(),
  listV2: vi.fn(),
  list: vi.fn(),
  deleteMulti: vi.fn()
}))
vi.mock('@aws-sdk/client-s3', async importOriginal => {
  const actual = await importOriginal<typeof import('@aws-sdk/client-s3')>()
  return {
    ...actual,
    S3Client: class Client {
      send = mocks.send
    }
  }
})
vi.mock('ali-oss', () => ({
  default: class Client {
    listV2 = mocks.listV2
    list = mocks.list
    deleteMulti = mocks.deleteMulti
  }
}))

describe('optional storage providers', () => {
  const config: StorageConfig = {
    provider: 'aws-s3',
    accessKeyId: 'test',
    accessKeySecret: 'test',
    region: 'us-east-1',
    bucket: 'test'
  }
  it('lists every S3 page', async () => {
    mocks.send
      .mockReset()
      .mockResolvedValueOnce({ Contents: [{ Key: 'one' }], NextContinuationToken: 'next' })
      .mockResolvedValueOnce({ Contents: [{ Key: 'two' }] })
    expect(await createStorageProvider(config).listObjects()).toEqual(['one', 'two'])
    expect(mocks.send.mock.calls[1]?.[0].input.ContinuationToken).toBe('next')
  })
  it('batches S3 deletion and surfaces partial provider failure', async () => {
    mocks.send.mockReset().mockResolvedValue({})
    const provider = createStorageProvider(config)
    await provider.deleteObjects(Array.from({ length: 1001 }, (_, i) => `objects/${i}`))
    expect(mocks.send).toHaveBeenCalledTimes(2)
    mocks.send.mockResolvedValueOnce({ Errors: [{ Code: 'AccessDenied' }] })
    await expect(provider.deleteObjects(['blocked'])).rejects.toThrow('partially failed')
  })
  it('selects OSS explicitly and lists empty or multiple pages', async () => {
    const provider = createStorageProvider({ ...config, provider: 'aliyun-oss' })
    mocks.list
      .mockReset()
      .mockResolvedValueOnce({ objects: [{ name: 'one' }], nextMarker: 'next' })
      .mockResolvedValueOnce({ objects: [{ name: 'two' }] })
    expect(await provider.listObjects()).toEqual(['one', 'two'])
    mocks.list.mockResolvedValueOnce({})
    expect(await provider.listObjects()).toEqual([])
  })
  it('propagates OSS failure and rejects a bucket-root deletion', async () => {
    const provider = createStorageProvider({ ...config, provider: 'aliyun-oss' })
    mocks.list.mockReset().mockRejectedValueOnce(new Error('storage offline'))
    const service = new StorageService(provider)
    await expect(service.deleteDir('tenant/')).rejects.toThrow('storage offline')
    await expect(service.deleteDir('')).rejects.toThrow('non-root')
    await expect(createStorageProvider(config).deleteDir('/')).rejects.toThrow('non-root')
  })
})
