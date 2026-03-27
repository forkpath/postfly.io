# Frontend Patterns Reference

Code templates for API client, studio components, and route pages. Replace `Foo` with your domain name.

## Table of Contents

1. [API Client](#api-client)
   - [Query Keys](#query-keys)
   - [Queries](#queries)
   - [Mutations](#mutations)
2. [Studio Components](#studio-components)
   - [Data Table](#data-table)
   - [Column Definitions](#column-definitions)
   - [Detail Components](#detail-components)
   - [Barrel Export](#barrel-export)
3. [Routes](#routes)
   - [Layout Route](#layout-route)
   - [List Route](#list-route)
   - [Detail Route](#detail-route)

---

## API Client

Files in `libs/api-client/src/domains/admin/`. Import factories from `../../lib/queries/factory`.

### Query Keys

Hierarchical key factory pattern — each level extends the parent:

```typescript
export const adminFooKeys = {
  all: ['admin', 'foos'] as const,
  lists: () => [...adminFooKeys.all, 'list'] as const,
  list: (params?: Record<string, unknown>) =>
    [...adminFooKeys.lists(), params] as const,
  details: () => [...adminFooKeys.all, 'detail'] as const,
  detail: (id: string) =>
    [...adminFooKeys.details(), id] as const,
  // Sub-resources extend detail
  bars: (fooId: string) =>
    [...adminFooKeys.detail(fooId), 'bars'] as const
} as const

export type AdminFooKeys = typeof adminFooKeys
```

This structure enables precise cache invalidation: `queryClient.invalidateQueries({ queryKey: adminFooKeys.detail(id) })` invalidates the detail and all sub-resources.

### Queries

Use `createQueryOptionsWithParams` for queries with parameters:

```typescript
import type { GetFoosRes } from '@libs/payload'
import { createQueryOptionsWithParams } from '../../lib/queries/factory'

export const adminFooQueries = {
  list: createQueryOptionsWithParams<
    GetFoosRes,
    Error,
    GetFoosRes,
    Record<string, unknown> | undefined
  >((api, params) => ({
    queryKey: adminFooKeys.list(params),
    queryFn: () => api.get('/admin/foos', { params })
  })),

  detail: createQueryOptionsWithParams<
    FooDetail,
    Error,
    FooDetail,
    { id: string }
  >((api, { id }) => ({
    queryKey: adminFooKeys.detail(id),
    queryFn: () => api.get(`/admin/foos/${id}`)
  })),

  // Sub-resource with extra params
  bars: createQueryOptionsWithParams<
    GetFooBarsRes,
    Error,
    GetFooBarsRes,
    { id: string } & Record<string, unknown>
  >((api, { id, ...params }) => ({
    queryKey: adminFooKeys.bars(id),
    queryFn: () => api.get(`/admin/foos/${id}/bars`, { params })
  }))
}
```

### Mutations

Use `createMutationFactory` — each action gets its own factory:

```typescript
import { createMutationFactory } from '../../lib/queries/factory'

export const adminFooMutations = {
  create: createMutationFactory<FooDetail, Error, CreateFooInput>(
    (api, data) => api.post('/admin/foos', data)
  ),

  update: createMutationFactory<
    FooDetail,
    Error,
    { id: string; data: UpdateFooInput }
  >((api, { id, data }) => api.patch(`/admin/foos/${id}`, data)),

  delete: createMutationFactory<void, Error, { id: string }>(
    (api, { id }) => api.delete(`/admin/foos/${id}`)
  )
}
```

### Barrel Export

File: `libs/api-client/src/domains/admin/foos.ts` exports keys + queries + mutations.

File: `libs/api-client/src/domains/admin/index.ts`:

```typescript
export * from './users'
export * from './organizations'
export * from './customers'
export * from './foos'  // add new domain
```

---

## Studio Components

Files in `libs/studio/src/modules/admin/foos/`.

### Data Table

File: `data-table/foos-data-table.tsx`

```tsx
import { useApiClient } from '@libs/api-client'
import {
  adminFooKeys,
  adminFooQueries
} from '@libs/api-client/domains/admin'

import { DataTable, useDataTable } from '../../shared/data-table'
import { useColumns } from './columns'

export function FoosDataTable() {
  const api = useApiClient()
  const columns = useColumns()

  const { table } = useDataTable<
    GetFoosRes['list'][number],
    GetFoosRes,
    ReturnType<typeof adminFooQueries.list>['queryKey']
  >({
    columns,
    query: ({ page, perPage, sorting, filters }) =>
      adminFooQueries.list(api, {
        page,
        limit: perPage,
        sort: sorting.length
          ? JSON.stringify(sorting)
          : undefined,
        ...filters
      }),
    initialState: {
      sorting: [{ id: 'createdAt', desc: true }],
      columnVisibility: { q: false }
    },
    enableRowSelection: false
  })

  return <DataTable table={table} />
}
```

### Column Definitions

File: `data-table/columns.tsx`

```tsx
import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { useTranslation } from '@libs/i18n'

import { DataTableColumnHeader } from '../../shared/data-table'

type FooRow = GetFoosRes['list'][number]

export function useColumns(): ColumnDef<FooRow>[] {
  const { t } = useTranslation()

  return useMemo(
    () => [
      // Hidden search column (for text search filter)
      {
        id: 'q',
        meta: {
          variant: 'text',
          placeholder: t('admin:foos.search.placeholder')
        },
        enableSorting: false,
        enableHiding: false
      },
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t('admin:foos.columns.name')}
          />
        ),
        cell: ({ row }) => (
          <Link to="/admin/foos/$id" params={{ id: row.original.id }}>
            {row.original.name}
          </Link>
        ),
        enableSorting: true
      },
      {
        accessorKey: 'status',
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t('admin:foos.columns.status')}
          />
        ),
        cell: ({ row }) => <Badge>{row.original.status}</Badge>,
        meta: {
          variant: 'multiSelect',
          options: [
            { label: 'Active', value: 'active' },
            { label: 'Inactive', value: 'inactive' }
          ]
        },
        enableSorting: false
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t('admin:foos.columns.createdAt')}
          />
        ),
        cell: ({ row }) => formatDate(row.original.createdAt),
        meta: { variant: 'dateRange' },
        enableSorting: true
      }
    ],
    [t]
  )
}
```

**Filter `meta.variant` types:**
- `'text'` — Free-text search input (typically hidden column with `id: 'q'`)
- `'multiSelect'` — Multi-select dropdown with `options: { label, value }[]`
- `'dateRange'` — Date range picker (maps to `rangeQuerySchema`)

### Detail Components

File: `foos/foo/foo-header.tsx`

```tsx
import { PageHeader } from '@libs/ui-shared/web'

interface FooHeaderProps {
  foo: FooDetail
}

export function FooHeader({ foo }: FooHeaderProps) {
  return (
    <PageHeader
      title={foo.name}
      description={`Created ${formatDate(foo.createdAt)}`}
    />
  )
}
```

File: `foos/foo/foo-details.tsx`

```tsx
export function FooDetails({ foo }: { foo: FooDetail }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Basic Info</CardTitle>
        </CardHeader>
        <CardContent>
          {/* field-by-field display */}
        </CardContent>
      </Card>
    </div>
  )
}
```

### Barrel Export

File: `libs/studio/src/modules/admin/foos/index.ts`

```typescript
export { FoosDataTable } from './data-table/foos-data-table'
export { FooHeader } from './foo/foo-header'
export { FooDetails } from './foo/foo-details'
```

File: `libs/studio/src/modules/admin/index.ts` — add:

```typescript
export * from './foos'
```

---

## Routes

Files in `apps/web/src/routes/_app/admin/`. Route pages are thin shells importing from `@libs/studio`.

### Layout Route

File: `apps/web/src/routes/_app/admin.tsx`

This typically already exists for admin. It provides:
- Auth guard via `beforeLoad` (checks `hasAdminPermission`)
- `SecondaryNavProvider` for sidebar navigation
- `<Outlet />` for child routes

### List Route

File: `apps/web/src/routes/_app/admin/foos/index.tsx`

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { FoosDataTable } from '@libs/studio'

const searchSchema = z.object({
  page: z.number().optional(),
  perPage: z.number().optional(),
  sort: z.string().optional(),
  q: z.string().optional(),
  status: z.union([z.string(), z.array(z.string())]).optional()
})

export const Route = createFileRoute('/_app/admin/foos/')({
  validateSearch: searchSchema,
  component: FoosPage
})

function FoosPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <FoosDataTable />
    </div>
  )
}
```

### Detail Route

File: `apps/web/src/routes/_app/admin/foos/$id.tsx`

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useApiClient } from '@libs/api-client'
import { adminFooQueries } from '@libs/api-client/domains/admin'

import { FooHeader, FooDetails } from '@libs/studio'

export const Route = createFileRoute('/_app/admin/foos/$id')({
  component: FooDetailPage
})

function FooDetailPage() {
  const { id } = Route.useParams()
  const api = useApiClient()
  const { data: foo } = useSuspenseQuery(
    adminFooQueries.detail(api, { id })
  )

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      <FooHeader foo={foo} />
      <FooDetails foo={foo} />
    </div>
  )
}
```

Use `$id.tsx` for dynamic segments. The `$` prefix tells TanStack Router this is a path parameter.

### Admin Navigation

Update `libs/studio/src/modules/admin/nav-config.ts` to add the new section:

```typescript
export function getAdminNavConfig(t: TranslationFunction) {
  return [
    // ... existing items
    {
      title: t('admin:foos.nav.title'),
      href: '/admin/foos',
      icon: Icons.Box
    }
  ]
}
```
