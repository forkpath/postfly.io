import type { ICommandHandler } from '@nestjs/cqrs'

import { CommandHandler } from '@nestjs/cqrs'

import { StorageService } from '../../services/storage.service'

export class GetDeleteUrlCommand {
  constructor(public readonly path: string) {}
}

@CommandHandler(GetDeleteUrlCommand)
export class GetDeleteUrlHandler implements ICommandHandler<GetDeleteUrlCommand, { url: string }> {
  constructor(private readonly storageService: StorageService) {}

  execute(command: GetDeleteUrlCommand): Promise<{ url: string }> {
    return this.storageService.getDeleteUrl(command.path)
  }
}
