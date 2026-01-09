import type { PutObjectOptions } from 'ali-oss'

export type StoragePolicyResponse = {
  expire: string
  policy: string
  signature: string
  accessid: string
  host: string
  callback: string
  dir: string
}

export interface StorageProvider {
  getPolicy: (dir: string, callbackUrl: string, uid: string) => Promise<StoragePolicyResponse>
  getObjectUrl: (key: string) => Promise<string>
  putObject: (key: string, body: Buffer, options?: PutObjectOptions) => Promise<unknown>
  getObject: (key: string) => Promise<Buffer>
  copyObject: (sourceKey: string, targetKey: string) => Promise<void>
  deleteObject: (key: string) => Promise<void>
  deleteObjects: (keys: string[]) => Promise<void>
  listObjects: () => Promise<string[]>
  deleteDir: (dirPrefix: string) => Promise<void>
}
