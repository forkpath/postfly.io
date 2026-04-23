import type { StoragePathReq, StorageUrlRes } from '@libs/payload'

import { createMutationFactory } from '../lib/queries/factory'

export const storageKeys = {
  all: ['storage'] as const,
  uploadUrl: () => [...storageKeys.all, 'upload-url'] as const,
  publicUrl: () => [...storageKeys.all, 'public-url'] as const,
  deleteUrl: () => [...storageKeys.all, 'delete-url'] as const,
  signedUrl: () => [...storageKeys.all, 'signed-url'] as const
} as const

export const storageMutations = {
  uploadUrl: createMutationFactory<StorageUrlRes, Error, StoragePathReq>((api, params) =>
    api.get('/storage/upload-url', { params })
  ),
  publicUrl: createMutationFactory<StorageUrlRes, Error, StoragePathReq>((api, params) =>
    api.get('/storage/public-url', { params })
  ),
  deleteUrl: createMutationFactory<StorageUrlRes, Error, StoragePathReq>((api, params) =>
    api.get('/storage/delete-url', { params })
  ),
  signedUrl: createMutationFactory<StorageUrlRes, Error, StoragePathReq>((api, params) =>
    api.get('/storage/signed-url', { params })
  )
}
