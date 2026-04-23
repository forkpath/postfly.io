import type { IQueryHandler } from '@nestjs/cqrs'

import { QueryHandler } from '@nestjs/cqrs'

import { StorageService } from '../../services/storage.service'

export class GetSignedUrlQuery {
  constructor(public readonly path: string) {}
}

@QueryHandler(GetSignedUrlQuery)
export class GetSignedUrlHandler implements IQueryHandler<GetSignedUrlQuery, { url: string }> {
  constructor(private readonly storageService: StorageService) {}

  execute(query: GetSignedUrlQuery): Promise<{ url: string }> {
    return this.storageService.getSignedUrl(query.path)
  }
}
