# Shared Library Patterns Reference

Code templates for `@libs/common`, `@libs/payload`, and other shared utilities.

## Table of Contents

1. [Constants](#constants)
2. [Payload Schemas](#payload-schemas)
   - [Request Schemas](#request-schemas)
   - [Response Schemas](#response-schemas)
   - [Shared Utilities](#shared-utilities)
   - [Schema Tests](#schema-tests)
3. [Prisma Schema](#prisma-schema)

---

## Constants

Single source of truth: `libs/common/src/constants/`. All libraries re-export from here.

### Defining New Constants

File: `libs/common/src/constants/<domain>.ts`

```typescript
export const FooStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ARCHIVED: 'archived'
} as const

export type FooStatus = (typeof FooStatus)[keyof typeof FooStatus]
```

Always:
1. Use `as const` for the object
2. Export a companion type with the same name (dual value+type export)
3. Add to barrel: `libs/common/src/constants/index.ts`

### Re-Export Chain

```
@libs/common/src/constants/auth.ts     ← DEFINES SocialProvider, UserRole, MemberRole, InvitationStatus
libs/auth-contract/src/lib/auth-contract.ts                ← import from @libs/common + re-export (public API unchanged)
@libs/payload/src/schemas/shared/constants.ts ← re-export from @libs/common (for use in Zod schemas)
```

```
@libs/common/src/constants/billing.ts  ← DEFINES BillingProvider, BillingSubscriptionStatus, BillingOrderStatus
libs/billing-contract/src/lib/billing-contract.ts         ← import from @libs/common + re-export
@libs/payload/src/schemas/shared/constants.ts ← re-export from @libs/common
```

When a library (like `@libs/auth-contract`) re-exports, use this pattern:

```typescript
import { UserRole, MemberRole } from '@libs/common'

// ... local definitions that DON'T exist in @libs/common ...

export {
  UserRole,       // re-exported from @libs/common
  MemberRole,     // re-exported from @libs/common
  AuthProvider,   // local to @libs/auth-contract
  SecondFactor    // local to @libs/auth-contract
}
```

When `@libs/payload` re-exports (keeping it dependency-light):

```typescript
// libs/payload/src/schemas/shared/constants.ts
export {
  BillingOrderStatus,
  BillingProvider,
  BillingSubscriptionStatus,
  InvitationStatus,
  MemberRole,
  SocialProvider,
  UserRole
} from '@libs/common'
```

### Using Constants in Zod Schemas

Convert to Zod-compatible format using `Object.values()`:

```typescript
import { FooStatus } from '../shared/constants'

// For z.enum() — needs a tuple of string literals
const fooStatusValues = Object.values(FooStatus) as [string, ...string[]]

const schema = z.object({
  status: z.enum(fooStatusValues)
})
```

Or with `multiValueQuerySchema` for filter params:

```typescript
import { UserRole } from '../shared/constants'

const schema = z.object({
  role: multiValueQuerySchema(
    z.enum(Object.values(UserRole) as [string, ...string[]])
  ).optional()
})
```

---

## Payload Schemas

Files in `libs/payload/src/schemas/`. Define API contracts that drive types across the stack.

### Shared Utilities

Already available in `libs/payload/src/schemas/shared/`:

```typescript
// pagination.schema.ts
offsetPaginationSchema    // { page: number, perPage: number }
cursorPaginationSchema    // { cursor?: string, limit: number }

// query-utils.ts
multiValueQuerySchema(T)  // Accepts single value or array
sortQuerySchema           // JSON-encoded sort array
rangeQuerySchema          // [number, number] tuple

// sort.schema.ts
sortSchema                // { id: string, desc: boolean }
```

### Request Schemas

File: `libs/payload/src/schemas/admin/foos.schema.ts`

```typescript
import { z } from 'zod'

import { FooStatus } from '../shared/constants'
import { offsetPaginationSchema } from '../shared/pagination.schema'
import {
  multiValueQuerySchema,
  rangeQuerySchema,
  sortQuerySchema
} from '../shared/query-utils'

// ==================== List ====================

export const getFoosReqSchema = offsetPaginationSchema.extend({
  sort: sortQuerySchema.optional(),
  q: z.string().optional(),
  status: multiValueQuerySchema(
    z.enum(Object.values(FooStatus) as [string, ...string[]])
  ).optional(),
  createdAt: rangeQuerySchema.optional()
})

export type GetFoosReq = z.infer<typeof getFoosReqSchema>

// ==================== Detail ====================

export const getFooReqSchema = z.object({
  id: z.string()
})

export type GetFooReq = z.infer<typeof getFooReqSchema>

// ==================== Create ====================

export const createFooReqSchema = z.object({
  name: z.string().min(1).max(100),
  status: z.enum(
    Object.values(FooStatus) as [string, ...string[]]
  ).optional()
})

export type CreateFooReq = z.infer<typeof createFooReqSchema>

// ==================== Update ====================

export const updateFooReqSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  status: z.enum(
    Object.values(FooStatus) as [string, ...string[]]
  ).optional()
})

export type UpdateFooReq = z.infer<typeof updateFooReqSchema>
```

### Response Schemas

```typescript
// ==================== List Response ====================

export const getFoosResSchema = z.object({
  list: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      status: z.string(),
      createdAt: z.string(),
      updatedAt: z.string()
    })
  ),
  total: z.number()
})

export type GetFoosRes = z.infer<typeof getFoosResSchema>

// ==================== Detail Response ====================

export const getFooResSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string()
})

export type GetFooRes = z.infer<typeof getFooResSchema>
```

### Barrel Exports

File: `libs/payload/src/schemas/admin/foos.schema.ts` — all schemas and types.

File: `libs/payload/src/schemas/admin/index.ts`:

```typescript
export * from './users.schema'
export * from './organizations.schema'
export * from './customers.schema'
export * from './foos.schema'  // add new domain
```

File: `libs/payload/src/index.ts` — ensure admin barrel is re-exported.

### Schema Tests

File: `libs/payload/src/schemas/admin/__tests__/foos.schema.spec.ts`

```typescript
import { describe, expect, it } from 'vitest'

import {
  createFooReqSchema,
  getFoosReqSchema,
  getFoosResSchema,
  updateFooReqSchema
} from '../foos.schema'

describe('foos.schema', () => {
  describe('getFoosReqSchema', () => {
    it('should parse valid list params', () => {
      const result = getFoosReqSchema.parse({
        page: 1,
        perPage: 10
      })
      expect(result.page).toBe(1)
      expect(result.perPage).toBe(10)
    })

    it('should apply defaults', () => {
      const result = getFoosReqSchema.parse({})
      expect(result.page).toBe(1)
      expect(result.perPage).toBe(10)
    })

    it('should parse status filter as array', () => {
      const result = getFoosReqSchema.parse({
        status: ['active', 'inactive']
      })
      expect(result.status).toEqual(['active', 'inactive'])
    })

    it('should wrap single status into array', () => {
      const result = getFoosReqSchema.parse({
        status: 'active'
      })
      expect(result.status).toEqual(['active'])
    })

    it('should reject invalid status', () => {
      expect(() =>
        getFoosReqSchema.parse({ status: 'invalid' })
      ).toThrow()
    })
  })

  describe('getFoosResSchema', () => {
    it('should parse valid response', () => {
      const result = getFoosResSchema.parse({
        list: [
          {
            id: '1',
            name: 'Test',
            status: 'active',
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01'
          }
        ],
        total: 1
      })
      expect(result.data).toHaveLength(1)
      expect(result.total).toBe(1)
    })
  })

  describe('createFooReqSchema', () => {
    it('should require name', () => {
      expect(() => createFooReqSchema.parse({})).toThrow()
    })

    it('should parse valid create input', () => {
      const result = createFooReqSchema.parse({
        name: 'New Foo'
      })
      expect(result.name).toBe('New Foo')
    })
  })

  describe('updateFooReqSchema', () => {
    it('should allow partial update', () => {
      const result = updateFooReqSchema.parse({
        name: 'Updated'
      })
      expect(result.name).toBe('Updated')
    })
  })
})
```

Run tests: `nx test payload`

---

## Prisma Schema

When adding a new model, update `libs/pg-dao/src/schema.prisma` (or a domain-specific `.prisma` file).

```prisma
model Foo {
  id        String   @id @default(cuid())
  name      String
  status    String   @default("active")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("foo")
}
```

After adding:
1. `pnpm db:generate` — regenerate Prisma client
2. `pnpm db:migrate <migration-name>` — create migration
3. Verify the Prisma client accessor: `prisma.foo` (matches model name, camelCase)

For multi-schema models (e.g., billing uses a separate schema), check that:
- The `@@map("table_name")` matches what you use in `$queryRawUnsafe`
- The Prisma client accessor matches the model name (not the table name)
