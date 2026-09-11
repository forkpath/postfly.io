import type { StorageProvider } from './providers/types'

import { Inject, Injectable } from '@nestjs/common'

export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER') as symbol

@Injectable()
export class StorageService {
  constructor(@Inject(STORAGE_PROVIDER) private readonly provider: StorageProvider) {}

  async getPolicy(dir: string, callbackUrl: string, uid: string) {
    return this.provider.getPolicy(dir, callbackUrl, uid)
  }

  async getObjectUrl(key: string): Promise<string> {
    return this.provider.getObjectUrl(key)
  }

  async putObject(key: string, body: Buffer, options?: Parameters<StorageProvider['putObject']>[2]) {
    return this.provider.putObject(key, body, options)
  }

  async getObject(key: string): Promise<Buffer> {
    return this.provider.getObject(key)
  }

  async copyObject(sourceKey: string, targetKey: string): Promise<void> {
    return this.provider.copyObject(sourceKey, targetKey)
  }

  async deleteObject(key: string): Promise<void> {
    return this.provider.deleteObject(key)
  }

  async deleteObjects(keys: string[]): Promise<void> {
    return this.provider.deleteObjects(keys)
  }

  async listObjects(): Promise<string[]> {
    return this.provider.listObjects()
  }

  async deleteDir(dirPrefix: string): Promise<void> {
    if (!dirPrefix.trim() || dirPrefix === '/') {
      throw new Error('A non-root storage prefix is required')
    }
    return this.provider.deleteDir(dirPrefix)
  }
}
