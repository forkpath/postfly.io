import { createZodDto } from 'nestjs-zod'

import { getCustomersReqSchema } from '@libs/payload'

export class ListCustomersQueryDto extends createZodDto(getCustomersReqSchema) {}
