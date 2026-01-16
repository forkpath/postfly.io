import { Injectable } from '@nestjs/common'

import { PrismaClient } from './generated/prisma/client'

// 仅作为 Nest DI 的注入标识与类型提示，实际实例由 prisma.ts 提供单例
@Injectable()
export class PrismaService extends PrismaClient {}
