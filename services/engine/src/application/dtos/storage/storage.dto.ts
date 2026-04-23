import { createZodDto } from 'nestjs-zod'

import { storagePathReqSchema } from '@libs/payload'

export class StoragePathQueryDto extends createZodDto(storagePathReqSchema) {}
