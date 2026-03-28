import { BadRequestException, Controller, Get, Query } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

import { Session } from '@libs/srv-shared'

interface AuthSession {
  user: { id: string }
}

const ALLOWED_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp'])

function validateImagePath(path: string): void {
  if (!path || typeof path !== 'string') {
    throw new BadRequestException('Missing required parameter: path')
  }

  const ext = path.split('.').pop()?.toLowerCase()
  if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
    throw new BadRequestException(`Unsupported file type. Allowed: ${[...ALLOWED_EXTENSIONS].join(', ')}`)
  }
}

@Controller('storage')
export class StorageController {
  private readonly client: S3Client
  private readonly bucket: string
  private readonly endpoint: string

  constructor(private readonly config: ConfigService) {
    const accessKeyId = this.config.get<string>('storage.accessKeyId', '')
    const secretAccessKey = this.config.get<string>('storage.accessKeySecret', '')
    const region = this.config.get<string>('storage.region', 'us-east-1')
    const endpoint = this.config.get<string>('storage.endpoint', '')
    this.bucket = this.config.get<string>('storage.bucket', 'ray')
    this.endpoint = endpoint

    const isCustomEndpoint = !!endpoint && !endpoint.includes('.amazonaws.com')

    this.client = new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
      ...(endpoint ? { endpoint } : {}),
      ...(isCustomEndpoint ? { forcePathStyle: true } : {})
    })
  }

  @Get('upload-url')
  async getUploadUrl(@Query('path') path: string, @Session() session: AuthSession) {
    validateImagePath(path)

    const url = await getSignedUrl(this.client, new PutObjectCommand({ Bucket: this.bucket, Key: path }), {
      expiresIn: 300
    })
    return { url }
  }

  @Get('public-url')
  getPublicUrl(@Query('path') path: string) {
    const url = this.endpoint
      ? `${this.endpoint}/${this.bucket}/${path}`
      : `https://${this.bucket}.s3.amazonaws.com/${path}`
    return { url }
  }

  @Get('delete-url')
  async getDeleteUrl(@Query('path') path: string, @Session() session: AuthSession) {
    validateImagePath(path)

    const url = await getSignedUrl(this.client, new DeleteObjectCommand({ Bucket: this.bucket, Key: path }), {
      expiresIn: 300
    })
    return { url }
  }

  @Get('signed-url')
  async getSignedUrl_(@Query('path') path: string, @Session() session: AuthSession) {
    validateImagePath(path)

    const url = await getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: path }), {
      expiresIn: 3600
    })
    return { url }
  }
}
