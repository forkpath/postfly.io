import type { ICommandHandler } from '@nestjs/cqrs'

import { CommandHandler } from '@nestjs/cqrs'

import { StorageService } from '../../services/storage.service'

export class GetUploadUrlCommand {
  constructor(public readonly path: string) {}
}

@CommandHandler(GetUploadUrlCommand)
export class GetUploadUrlHandler implements ICommandHandler<GetUploadUrlCommand, { url: string }> {
  constructor(private readonly storageService: StorageService) {}

  execute(command: GetUploadUrlCommand): Promise<{ url: string }> {
    return this.storageService.getUploadUrl(command.path)
  }
}
