# Backend Patterns Reference

Code templates for all engine layers. Replace `Foo` with your domain name throughout.

## Table of Contents

1. [Domain Layer](#domain-layer)
   - [Entity](#entity)
   - [Value Object](#value-object)
   - [Repository Interface](#repository-interface)
   - [Exception](#exception)
   - [Use Case](#use-case)
2. [Application Layer](#application-layer)
   - [DTO](#dto)
   - [Mapper](#mapper)
   - [Query Handler](#query-handler)
   - [Command Handler](#command-handler)
   - [Handler Collections](#handler-collections)
3. [Infrastructure Layer](#infrastructure-layer)
   - [Repository Implementation](#repository-implementation)
4. [Presentation Layer](#presentation-layer)
   - [Controller](#controller)
   - [Module](#module)
   - [AppModule Registration](#appmodule-registration)

---

## Domain Layer

All files in `services/engine/src/domain/`. Zero external dependencies.

### Entity

File: `entities/foo.entity.ts`

```typescript
export interface FooEntity {
  readonly id: string
  readonly name: string
  readonly status: string
  readonly createdAt: Date
  readonly updatedAt: Date
}
```

Entities are pure interfaces with `readonly` fields. No methods, no decorators, no framework imports. If the entity needs derived constants (like a status enum), import them from `@libs/common`.

### Value Object

File: `value-objects/foo-status.vo.ts`

```typescript
export const FooStatusEnum = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ARCHIVED: 'archived'
} as const

export type FooStatusValue =
  (typeof FooStatusEnum)[keyof typeof FooStatusEnum]

export class FooStatus {
  private constructor(private readonly value: FooStatusValue) {}

  static create(status: string): FooStatus {
    const values = Object.values(FooStatusEnum) as string[]
    if (!values.includes(status)) {
      throw new Error(`Invalid foo status: ${status}`)
    }
    return new FooStatus(status as FooStatusValue)
  }

  getValue(): FooStatusValue {
    return this.value
  }

  equals(other: FooStatus): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
```

Pattern: Private constructor → static `create()` factory with validation → `getValue()` → `equals()` → `toString()`.

For VOs with business logic, add domain methods (e.g., `MemberRole.isHigherThan()`, `InvitationStatus.canTransitionTo()`).

### Repository Interface

File: `repositories/foo.repository.interface.ts`

```typescript
import type { FooEntity } from '../entities/foo.entity'

export interface PaginatedResult<T> {
  list: T[]
  total: number
}

export interface FooListParams {
  page: number
  perPage: number
  sort?: { id: string; desc: boolean }[]
  q?: string
  status?: string[]
}

export interface IFooRepository {
  findById(id: string): Promise<FooEntity | null>
  findMany(params: FooListParams): Promise<PaginatedResult<FooEntity>>
  create(data: Partial<FooEntity>): Promise<FooEntity>
  update(id: string, data: Partial<FooEntity>): Promise<FooEntity>
  delete(id: string): Promise<void>
}

export const FOO_REPOSITORY = Symbol('FOO_REPOSITORY')
```

The Symbol token is used for NestJS dependency injection. Always export it from the same file as the interface.

### Exception

File: `exceptions/foo.exception.ts`

```typescript
export abstract class FooDomainException extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message)
    this.name = this.constructor.name
  }
}

export class FooNotFoundException extends FooDomainException {
  constructor(fooId: string) {
    super(`Foo with id ${fooId} not found`, 'FOO_NOT_FOUND')
  }
}

export class FooAlreadyExistsException extends FooDomainException {
  constructor(identifier: string) {
    super(
      `Foo with identifier ${identifier} already exists`,
      'FOO_ALREADY_EXISTS'
    )
  }
}
```

Pattern: One abstract base per domain, concrete subclasses per error case, each with a machine-readable `code`.

### Use Case

File: `use-cases/foo/delete-foo.usecase.ts`

```typescript
import type { IFooRepository } from '../../repositories/foo.repository.interface'
import { FooNotFoundException } from '../../exceptions/foo.exception'

export interface DeleteFooInput {
  fooId: string
  operatorId: string
}

export interface DeleteFooOutput {
  success: boolean
}

export class DeleteFooUseCase {
  constructor(private readonly fooRepository: IFooRepository) {}

  async execute(input: DeleteFooInput): Promise<DeleteFooOutput> {
    const foo = await this.fooRepository.findById(input.fooId)
    if (!foo) {
      throw new FooNotFoundException(input.fooId)
    }

    await this.fooRepository.delete(input.fooId)
    return { success: true }
  }
}
```

Use cases are pure classes. They receive repository interfaces via constructor injection (not decorators). Business validation and domain rules live here.

Test file: `use-cases/foo/__tests__/delete-foo.usecase.spec.ts`

```typescript
import { describe, it, expect, vi } from 'vitest'
import { DeleteFooUseCase } from '../delete-foo.usecase'
import { FooNotFoundException } from '../../../exceptions/foo.exception'
import type { IFooRepository } from '../../../repositories/foo.repository.interface'

describe('DeleteFooUseCase', () => {
  const mockRepo: IFooRepository = {
    findById: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }

  const useCase = new DeleteFooUseCase(mockRepo)

  it('should delete when foo exists', async () => {
    vi.mocked(mockRepo.findById).mockResolvedValue({
      id: 'foo-1', name: 'Test', status: 'active',
      createdAt: new Date(), updatedAt: new Date()
    })
    vi.mocked(mockRepo.delete).mockResolvedValue()

    const result = await useCase.execute({
      fooId: 'foo-1', operatorId: 'op-1'
    })

    expect(result.success).toBe(true)
    expect(mockRepo.delete).toHaveBeenCalledWith('foo-1')
  })

  it('should throw when foo not found', async () => {
    vi.mocked(mockRepo.findById).mockResolvedValue(null)

    await expect(
      useCase.execute({ fooId: 'missing', operatorId: 'op-1' })
    ).rejects.toThrow(FooNotFoundException)
  })
})
```

---

## Application Layer

All files in `services/engine/src/application/`. This layer depends on domain interfaces + `@libs/payload` schemas.

### DTO

File: `dtos/foo/foo.dto.ts`

```typescript
import { createZodDto } from 'nestjs-zod'
import { getFoosReqSchema } from '@libs/payload'

export class ListFoosQueryDto extends createZodDto(getFoosReqSchema) {}
```

DTOs wrap Zod schemas from `@libs/payload` using `createZodDto`. This gives automatic validation via `ZodValidationPipe` in the controller.

### Mapper

File: `mappers/foo.mapper.ts`

```typescript
import type { FooEntity } from '../../domain/entities/foo.entity'
import type { GetFoosRes } from '@libs/payload'

type FooListItem = GetFoosRes['list'][number]

export class FooMapper {
  static toListItem(entity: FooEntity): FooListItem {
    return {
      id: entity.id,
      name: entity.name,
      status: entity.status,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString()
    }
  }
}
```

Mappers are classes with only static methods. They convert between domain entities and response types (inferred from `@libs/payload` Zod schemas). Date fields typically need `.toISOString()` conversion.

### Query Handler

File: `queries/foo/list-foos.query.ts`

```typescript
import { Inject } from '@nestjs/common'
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import type { GetFoosRes } from '@libs/payload'

import {
  FOO_REPOSITORY,
  type IFooRepository
} from '../../../domain/repositories/foo.repository.interface'

export class ListFoosQuery {
  constructor(public readonly params: Record<string, unknown>) {}
}

@QueryHandler(ListFoosQuery)
export class ListFoosHandler
  implements IQueryHandler<ListFoosQuery, GetFoosRes>
{
  constructor(
    @Inject(FOO_REPOSITORY)
    private readonly fooRepository: IFooRepository
  ) {}

  async execute(query: ListFoosQuery): Promise<GetFoosRes> {
    const result = await this.fooRepository.findMany(
      query.params as never
    )

    return {
      list: result.list.map(FooMapper.toListItem),
      total: result.total
    }
  }
}
```

The `as never` assertion on query params handles the type gap between NestJS's `Record<string, unknown>` (from `@Query()`) and the repository's specific params type.

### Command Handler

File: `commands/foo/delete-foo.command.ts`

```typescript
import { Inject } from '@nestjs/common'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { type ICommandHandler, CommandHandler } from '@nestjs/cqrs'

import {
  FOO_REPOSITORY,
  type IFooRepository
} from '../../../domain/repositories/foo.repository.interface'

export class DeleteFooCommand {
  constructor(
    public readonly id: string,
    public readonly operatorId: string
  ) {}
}

@CommandHandler(DeleteFooCommand)
export class DeleteFooHandler
  implements ICommandHandler<DeleteFooCommand, void>
{
  constructor(
    @Inject(FOO_REPOSITORY)
    private readonly fooRepository: IFooRepository
  ) {}

  async execute(command: DeleteFooCommand): Promise<void> {
    const foo = await this.fooRepository.findById(command.id)
    if (!foo) {
      throw new NotFoundException('Foo not found')
    }

    await this.fooRepository.delete(command.id)
  }
}
```

Command handlers translate domain exceptions to NestJS HTTP exceptions (`NotFoundException`, `BadRequestException`).

### Handler Collections

At the bottom of the queries/commands directories or in a shared file, export handler arrays for module registration:

```typescript
// queries/foo/index.ts
export const FooQueryHandlers = [ListFoosHandler, GetFooHandler]

// commands/foo/index.ts
export const FooCommandHandlers = [DeleteFooHandler, UpdateFooHandler]
```

---

## Infrastructure Layer

Files in `services/engine/src/infrastructure/`.

### Repository Implementation

File: `repositories/foo.repository.ts`

```typescript
import { Injectable } from '@nestjs/common'
import { prisma } from '@libs/pg-dao'

import type { FooEntity } from '../../domain/entities/foo.entity'
import type {
  IFooRepository,
  FooListParams,
  PaginatedResult
} from '../../domain/repositories/foo.repository.interface'

@Injectable()
export class FooRepository implements IFooRepository {
  async findById(id: string): Promise<FooEntity | null> {
    const foo = await prisma.foo.findUnique({ where: { id } })
    return foo ? this.mapToEntity(foo) : null
  }

  async findMany(
    params: FooListParams
  ): Promise<PaginatedResult<FooEntity>> {
    const { page, perPage, sort, q, status } = params

    const where: Record<string, unknown> = {}

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } }
      ]
    }

    if (status?.length) {
      where.status = { in: status }
    }

    const orderBy = sort?.length
      ? sort.map((s) => ({ [s.id]: s.desc ? 'desc' : 'asc' }))
      : [{ createdAt: 'desc' }]

    const [total, data] = await Promise.all([
      prisma.foo.count({ where }),
      prisma.foo.findMany({
        where,
        orderBy,
        skip: (page - 1) * perPage,
        take: perPage
      })
    ])

    return {
      data: data.map((item) => this.mapToEntity(item)),
      total
    }
  }

  async create(data: Partial<FooEntity>): Promise<FooEntity> {
    const created = await prisma.foo.create({ data: data as never })
    return this.mapToEntity(created)
  }

  async update(
    id: string,
    data: Partial<FooEntity>
  ): Promise<FooEntity> {
    const updated = await prisma.foo.update({
      where: { id },
      data: data as never
    })
    return this.mapToEntity(updated)
  }

  async delete(id: string): Promise<void> {
    await prisma.foo.delete({ where: { id } })
  }

  private mapToEntity(raw: Record<string, unknown>): FooEntity {
    return {
      id: raw.id as string,
      name: raw.name as string,
      status: (raw.status as string) ?? 'active',
      createdAt: raw.createdAt as Date,
      updatedAt: raw.updatedAt as Date
    }
  }
}
```

Key patterns:
- `Promise.all` for parallel count + data queries
- `where` object built dynamically from filter params
- `orderBy` defaults to `createdAt desc`
- Nullable fields use `?? 'default'` in `mapToEntity`

For complex queries (aggregation, HAVING, multi-table joins), use raw SQL:

```typescript
async findWithStats(params: FooListParams): Promise<PaginatedResult<FooWithStats>> {
  const countResult = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
    `SELECT COUNT(*) as count FROM "foo" WHERE ...`
  )

  const data = await prisma.$queryRawUnsafe<FooRawRow[]>(
    `SELECT f.*, COUNT(r.id) as "relatedCount"
     FROM "foo" f
     LEFT JOIN "related" r ON r."fooId" = f.id
     GROUP BY f.id
     HAVING COUNT(r.id) > 0
     ORDER BY f."createdAt" DESC
     LIMIT $1 OFFSET $2`,
    params.perPage,
    (params.page - 1) * params.perPage
  )

  return {
    data: data.map((row) => this.mapToEntityWithStats(row)),
    total: Number(countResult[0].count)
  }
}
```

Use actual database table names in raw SQL (check Prisma schema for `@@map`).

---

## Presentation Layer

Files in `services/engine/src/presentation/http/<name>/`.

### Controller

File: `foo.controller.ts`

```typescript
import { Controller, Get, Post, Patch, Delete, Query, Param, Body } from '@nestjs/common'
import { CommandBus, QueryBus } from '@nestjs/cqrs'

import type { GetFoosRes } from '@libs/payload'

import { Roles } from '../../../common/decorators/roles.decorator'
import { ListFoosQueryDto } from '../../../application/dtos/foo/foo.dto'
import { ListFoosQuery } from '../../../application/queries/foo/list-foos.query'
import { DeleteFooCommand } from '../../../application/commands/foo/delete-foo.command'
import { Session } from '../../../common/decorators/session.decorator'

@Controller('admin/foos')
@Roles(['admin'])
export class FooController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus
  ) {}

  @Get()
  async list(
    @Query() query: ListFoosQueryDto
  ): Promise<GetFoosRes> {
    return this.queryBus.execute(new ListFoosQuery(query))
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.queryBus.execute(new GetFooQuery(id))
  }

  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @Session() session: { userId: string }
  ) {
    return this.commandBus.execute(
      new DeleteFooCommand(id, session.userId)
    )
  }
}
```

Controllers are thin — they only convert HTTP concerns (params, query, body, session) into Command/Query objects.

### Module

File: `foo.module.ts`

```typescript
import { Module } from '@nestjs/common'
import { CqrsModule } from '@nestjs/cqrs'

import { FOO_REPOSITORY } from '../../../domain/repositories/foo.repository.interface'
import { FooRepository } from '../../../infrastructure/repositories/foo.repository'
import { FooQueryHandlers } from '../../../application/queries/foo'
import { FooCommandHandlers } from '../../../application/commands/foo'
import { FooController } from './foo.controller'

@Module({
  imports: [CqrsModule],
  controllers: [FooController],
  providers: [
    { provide: FOO_REPOSITORY, useClass: FooRepository },
    ...FooQueryHandlers,
    ...FooCommandHandlers
  ],
  exports: [FOO_REPOSITORY]
})
export class FooModule {}
```

### AppModule Registration

Add the new module to `services/engine/src/app.module.ts`:

```typescript
@Module({
  imports: [
    // ... existing modules
    FooModule
  ]
})
export class AppModule {}
```
