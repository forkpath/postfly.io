import { Module } from '@nestjs/common'
import { CqrsModule } from '@nestjs/cqrs'

import { GetDeleteUrlHandler } from '#/application/commands/storage/get-delete-url.command'
import { GetUploadUrlHandler } from '#/application/commands/storage/get-upload-url.command'
import { GetPublicUrlHandler } from '#/application/queries/storage/get-public-url.query'
import { GetSignedUrlHandler } from '#/application/queries/storage/get-signed-url.query'
import { StorageService } from '#/application/services/storage.service'

import { StorageController } from './storage.controller'

@Module({
  imports: [CqrsModule],
  controllers: [StorageController],
  providers: [StorageService, GetUploadUrlHandler, GetDeleteUrlHandler, GetPublicUrlHandler, GetSignedUrlHandler]
})
export class StorageModule {}
