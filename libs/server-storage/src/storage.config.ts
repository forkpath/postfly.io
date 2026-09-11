export interface StorageConfig {
  provider: 'aws-s3' | 'aliyun-oss'
  accessKeyId: string
  accessKeySecret: string
  region: string
  bucket: string
  endpoint?: string
}
