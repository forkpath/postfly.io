import type { StorageConfig } from '../storage.config'
import type { StorageProvider } from './types'

import { createStorageProvider as createAliyunOssProvider } from './aliyun-oss'
import { createStorageProvider as createAwsS3Provider } from './aws-s3'

export { createAliyunOssProvider, createAwsS3Provider }

export function createStorageProvider(config: StorageConfig): StorageProvider {
  switch (config.provider) {
    case 'aws-s3':
      return createAwsS3Provider(config)
    case 'aliyun-oss':
      return createAliyunOssProvider(config)
    default:
      throw new Error('Storage provider must be aws-s3 or aliyun-oss')
  }
}
