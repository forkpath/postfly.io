import type { IQueryHandler } from '@nestjs/cqrs'

import { QueryHandler } from '@nestjs/cqrs'

import { StorageService } from '../../services/storage.service'

export class GetPublicUrlQuery {
  constructor(public readonly path: string) {}
}

@QueryHandler(GetPublicUrlQuery)
export class GetPublicUrlHandler implements IQueryHandler<GetPublicUrlQuery, { url: string }> {
  constructor(private readonly storageService: StorageService) {}

  execute(query: GetPublicUrlQuery): Promise<{ url: string }> {
    return Promise.resolve(this.storageService.getPublicUrl(query.path))
  }
}
