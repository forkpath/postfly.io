---
name: ray-module-dev
description: End-to-end guide for developing new feature modules in the ray Nx monorepo using Clean Architecture + CQRS. Use this skill whenever developing a new backend module, admin page, CRUD feature, new domain entity, NestJS controller, API endpoint, data table page, or any full-stack feature that spans engine + studio + payload + api-client. Also use when adding sub-resources to existing domains (e.g. adding "orders" to "users"), creating new admin management pages, or implementing list/detail views with filtering and pagination. Even if the user just says "add X management" or "create Y endpoint", this skill applies.
---

# Ray Module Development Guide

This skill codifies the development workflow, architecture patterns, and code conventions for building full-stack feature modules in the ray monorepo. It ensures consistency across the codebase and avoids common pitfalls.

## Architecture Overview

The ray monorepo follows **Clean Architecture** with **CQRS** (Command Query Responsibility Segregation):

```
@libs/common        → Shared constants (single source of truth for enums)
@libs/payload       → Zod request/response schemas (dependency-light)
@libs/api-client    → React Query keys + query/mutation factories
@libs/studio        → Reusable UI components (pages, data tables, forms)
apps/web            → TanStack Router file-based routes (thin shells)
services/engine     → NestJS backend (Clean Architecture layers)
```

### Dependency Flow (strict — never import upward)

```
common → payload → api-client → studio → apps/web
                                           ↕
common → engine (domain → application → infrastructure → presentation)
```

## Development Workflow

Follow this **exact order**. Each step depends on the output of the previous one.

### Phase 0: Constants

If the new domain introduces enum-like values (roles, statuses, providers):

1. Define them in `libs/common/src/constants/` using the `as const` + type pattern
2. Re-export from `libs/common/src/constants/index.ts`
3. If needed in `@libs/auth-contract` or `@libs/billing-contract`, those libs should import from `@libs/common` and re-export (never redefine)
4. `@libs/payload` references constants via `libs/payload/src/schemas/shared/constants.ts` which re-exports from `@libs/common`

> Read `references/shared-patterns.md` → "Constants" section for the exact pattern.

### Phase 1: Payload Schemas

Define API contracts first — they drive the types across the entire stack.

1. Create `libs/payload/src/schemas/<domain>/` (or `admin/<domain>.schema.ts` for admin features)
2. Define request schemas composing the shared utilities: `offsetPaginationSchema`, `sortQuerySchema`, `multiValueQuerySchema`, `rangeQuerySchema`
3. Define response schemas using `z.object()` or `z.array()`
4. Export request/response types via `z.infer<>`
5. Add to barrel: `libs/payload/src/schemas/<domain>/index.ts` → `libs/payload/src/index.ts`
6. Write schema tests in `__tests__/<domain>.schema.spec.ts`

> Read `references/shared-patterns.md` → "Payload Schemas" section for templates.

### Phase 2: Domain Layer (Engine)

The domain layer has zero framework dependencies. Build it inside `services/engine/src/domain/`:

**Order: Entity → Value Objects → Repository Interface → Exceptions → Domain Services/Specifications (only when needed)**

1. **Entity** (`entities/<name>.entity.ts`): Class with private state, factory methods, getters, and business behaviour
2. **Value Objects** (`value-objects/<name>.vo.ts`): Private constructor + static `create()` factory + validation + `equals()`
3. **Repository Interface** (`repositories/<name>.repository.interface.ts`): Interface + `Symbol` injection token using domain VO/entity/criteria types only
4. **Exceptions** (`exceptions/<name>.exception.ts`): `DomainException` subclasses with error codes, `i18nKey`, and `httpStatus`
5. **Domain Services/Specifications**: Optional pure business rules with no repository IO

Never put repository-injected use cases in domain. A class that loads data, calls repositories, delegates to Better Auth, or coordinates persistence belongs in `application/use-cases`.

> Read `references/backend-patterns.md` → "Domain Layer" section for all templates.

### Phase 3: Application Layer (Engine)

The application layer bridges domain and infrastructure via CQRS. Build it inside `services/engine/src/application/`:

**Order: DTOs → Mappers → Use Cases → Query Handlers → Command Handlers**

1. **DTOs** (`dtos/<name>/<name>.dto.ts`): Use `createZodDto()` from `nestjs-zod` wrapping payload schemas
2. **Mappers** (`mappers/<name>.mapper.ts`): Static methods converting payload request → domain criteria and domain result → response type (from `@libs/payload`)
3. **Use Cases** (`use-cases/<name>/<action>.usecase.ts`): Framework-free application orchestration for write operations and complex reads
4. **Queries** (`queries/<name>/<action>.query.ts`): Query class + `@QueryHandler` with `@Inject(SYMBOL)` repository or use case
5. **Commands** (`commands/<name>/<action>.command.ts`): Command class + `@CommandHandler` that delegates to a use case
6. Collect handlers into arrays: `const QueryHandlers = [...]` and `const CommandHandlers = [...]`

DTO files should not redefine response schemas. Response types come from `@libs/payload`; engine mappers shape domain results into those response types.

> Read `references/backend-patterns.md` → "Application Layer" section for templates.

### Phase 4: Infrastructure Layer (Engine)

Implements domain interfaces with Prisma. Build it inside `services/engine/src/infrastructure/`:

1. **Repository** (`repositories/<name>.repository.ts`): `@Injectable()` class implementing `I<Name>Repository`
2. Simple queries → Prisma client methods
3. Complex queries with aggregates/HAVING → `prisma.$queryRawUnsafe`
4. Private `mapToEntity()` methods at the bottom of the class
5. Auth-related operations → delegate to `auth.api.*` (Better Auth)

> Read `references/backend-patterns.md` → "Infrastructure Layer" section for templates.

### Phase 5: Presentation Layer (Engine)

Thin HTTP layer. Build it inside `services/engine/src/presentation/http/<name>/`:

1. **Controller** (`<name>.controller.ts`): `@Controller('admin/<name>')` + `@Roles(['admin'])` + inject `QueryBus`/`CommandBus`
2. **Module** (`<name>.module.ts`): Imports `CqrsModule`, binds repository Symbol → implementation class, registers all handlers
3. Register the new module in `app.module.ts`

> Read `references/backend-patterns.md` → "Presentation Layer" section for templates.

### Phase 6: API Client

Build inside `libs/api-client/src/domains/<domain>/` (or `admin/<name>.ts` for admin features):

1. **Keys**: Hierarchical query key factory (`all → lists → list(params) → details → detail(id) → subresources`)
2. **Queries**: Use `createQueryOptionsWithParams` factory, typed with payload response types
3. **Mutations**: Use `createMutationFactory`, one per action (create/update/delete/ban/etc.)
4. Export from barrel: `libs/api-client/src/domains/<domain>/index.ts`

> Read `references/frontend-patterns.md` → "API Client" section for templates.

### Phase 7: Studio Components

Build inside `libs/studio/src/modules/<domain>/`:

1. **Data Table** (`data-table/<name>-data-table.tsx`): Uses `useDataTable` hook + column definitions with `meta.variant` for filter types
2. **Column Definitions** (`data-table/columns.tsx`): `useColumns()` hook returning `ColumnDef[]` with `DataTableColumnHeader`
3. **Detail Pages** (for entity detail views): Sections as separate components
4. **Barrel Export** (`index.ts`): Re-export all public components
5. Register in `libs/studio/src/modules/<domain>/index.ts` → `libs/studio/src/index.ts`

> Read `references/frontend-patterns.md` → "Studio Components" section for templates.

### Phase 8: Route Pages

Build inside `apps/web/src/routes/_app/<domain>/`:

1. **Layout route** (`<domain>.tsx`): Auth guard via `beforeLoad` + `SecondaryNavProvider`
2. **List route** (`<domain>/index.tsx`): `validateSearch` with the search schema + import DataTable component
3. **Detail route** (`<domain>/$id.tsx`): `useParams` to get ID + import detail components
4. Route pages are **thin shells** — all logic lives in `@libs/studio`

> Read `references/frontend-patterns.md` → "Routes" section for templates.

### Phase 9: Tests

1. **Payload schema tests** (`libs/payload/src/schemas/<domain>/__tests__/`)
2. **Domain use case tests** (`services/engine/src/domain/use-cases/<name>/__tests__/`)
3. **Frontend component tests** (if complex interaction logic exists)

## Critical Conventions

### Naming

| Artifact | File Name | Class/Type Name |
|---|---|---|
| Entity | `foo.entity.ts` | `Foo` (class) |
| Value Object | `foo-bar.vo.ts` | `FooBar` (class) |
| Application Use Case | `application/use-cases/foo/verb-noun.usecase.ts` | `VerbNounUseCase` |
| Repository Interface | `foo.repository.interface.ts` | `IFooRepository` |
| Repository Implementation | `foo.repository.ts` | `FooRepository` |
| Injection Token | in repository interface file | `FOO_REPOSITORY = Symbol('FOO_REPOSITORY')` |
| Exception Base | `foo.exception.ts` | `FooDomainException` (abstract) |
| Command | `verb-noun.command.ts` | `VerbNounCommand` + `VerbNounHandler` |
| Query | `verb-noun.query.ts` | `VerbNounQuery` + `VerbNounHandler` |
| DTO | `foo.dto.ts` | `ListFooQueryDto extends createZodDto(...)` |
| Mapper | `foo.mapper.ts` | `FooMapper` (static methods) |
| Controller | `foo.controller.ts` | `FooController` |
| Module | `foo.module.ts` | `FooModule` |
| Schema | `foo.schema.ts` | `getFooReqSchema` / `getFooResSchema` |
| Query Keys | `foo.ts` | `adminFooKeys` |
| Query Options | `foo.ts` | `adminFooQueries` |
| Mutations | `foo.ts` | `adminFooMutations` |

### TypeScript Rules

- **No `any`** — use `unknown` + type narrowing or `as const` assertions
- **No enums** — use `as const` objects + derived union types (defined in `@libs/common`)
- **Prefer interfaces** over type aliases for object shapes
- **Type assertions**: Use `as never` for NestJS `@Query()` → specific DTO mismatches; use `as unknown as TargetType` for entity→response type gaps (e.g., `role: string` vs `role: 'admin' | 'member'`)
- **Nullish coalescing**: Use `?? 'default'` when mapping Prisma `T | null` to entity `T` fields

### File Organization

- kebab-case for all filenames
- Group by feature/domain, not by technical layer
- Tests go in `__tests__/` directories adjacent to the code they test
- Barrel exports: every module has an `index.ts`

### Prisma Patterns

- Simple CRUD → `prisma.<model>.findMany/create/update/delete`
- Complex aggregates → `prisma.$queryRawUnsafe` with actual database table names
- Pagination → destructure `{ page, perPage }`, use `skip: (page - 1) * perPage, take: perPage`
- Parallel count+data → `Promise.all([prisma.<model>.count({ where }), prisma.<model>.findMany({ where, skip, take, orderBy })])`
- Multi-schema models (e.g., billing) → check Prisma client accessor names match schema (`prisma.customer`, not `prisma.billingCustomer`)

## Dual-Channel API Architecture

The app uses **two separate HTTP channels**. Never mix them.

| Channel | Transport | Auth | Response Format | Used For |
|---|---|---|---|---|
| **Engine** | `useApiClient()` → Axios via `@libs/api-client` | Cookie + `@Roles()` guard | `{ code, msg, data }` (auto-unwrapped) | All business CRUD, admin management |
| **Better Auth** | `authClient.*` from app-owned `createClient()` using `@libs/auth-client-web/native` | Cookie (Better Auth built-in) | Raw JSON (varies per endpoint) | Login, register, session, organization membership |

### Engine Channel Setup (Critical)

The Engine channel requires correct wiring across 4 layers:

1. **NestJS Engine** (`services/engine/src/main.ts`): `app.setGlobalPrefix('api/v1')` — all business endpoints live under `/api/v1/*`
2. **Vite Proxy** (`apps/web/vite.config.mts`): `'/api'` → `http://localhost:8000` — dev server forwards `/api/*` to Engine (matches both `/api/v1/*` engine routes and `/api/auth/*` Better Auth routes)
3. **ApiClientProvider** (`apps/web/src/routes/_app.tsx`): `options={{ baseURL: '/api/v1' }}` — Axios prepends `/api/v1` to all paths
4. **API Client queries** (`libs/api-client/src/domains/`): paths are written **without** the `/api/v1` prefix (e.g., `api.get('/admin/users')` → actual request `/api/v1/admin/users`)
5. **Better Auth** (`libs/auth-server/src/lib/auth-server.ts`): `basePath: '/api/auth'` — auth endpoints live under `/api/auth/*` (independent of engine `globalPrefix`, not versioned)

> If `baseURL` is not set to `/api/v1`, requests bypass the Vite proxy and never reach the Engine.

## Response Wrapping & Unwrapping Chain

```
Engine Controller returns: { list: [...], total: 5 }
           ↓
WrapResInterceptor wraps: { code: 0, msg: 'ok', data: { list: [...], total: 5 } }
           ↓
HTTP Response body: { code: 0, msg: 'ok', data: { list: [...], total: 5 } }
           ↓
api-core interceptor: isWrappedResponse? yes → code === 0? yes → return data.data
           ↓
React Query receives: { list: [...], total: 5 }  (the inner payload, unwrapped)
           ↓
useDataTable reads: query.data?.list (the array) + query.data?.total
```

**Key types:**

- `IDataRes<T>` (`@libs/payload`): `{ code: number, msg: string, data: T }` — the wire format
- `GetUsersRes` / `GetOrganizationsRes` / etc.: the `T` inside `IDataRes<T>` — what React Query receives after unwrapping
- `WrappedResponse<T>` (`@libs/api-core`): runtime detection type used by the interceptor

**Error path:**

```
Engine throws HttpException or ExceptionResponse
           ↓
AllExceptionsFilter catches: returns { code: <httpStatus>, msg: <i18n translated message> }
           ↓
api-core interceptor: HTTP error → isWrappedResponse? yes → throw ApiError(msg, { code, status })
           ↓
React Query onError → global handler → toast.error(getErrorMessage(error))
```

## Global Error Handling

Configured in `apps/web/src/router.tsx` via `getQueryClient()`:

- **`onQueryError`**: Fires on any failed query (GET requests). Shows `toast.error()` unless `query.meta.suppressError` is set.
- **`onMutationError`**: Fires on any failed mutation (POST/PATCH/DELETE). Always shows `toast.error()`.
- **`getErrorMessage(error)`**: Extracts human-readable message from `ApiError` (server i18n message), `ApiNetworkError` (network failure), or generic `Error`.

To suppress toast for a specific query, set meta:

```ts
useQuery({
  ...someQuery(api, params),
  meta: { suppressError: true }
})
```

### Error Classes (`@libs/api-core`)

- `ApiError`: Server returned an error (HTTP 4xx/5xx or `code !== 0`). Has `.code`, `.status`, `.message` (i18n from backend).
- `ApiNetworkError`: No server response (timeout, DNS, CORS). Has `.cause` (original AxiosError).

## Quick Reference: Full-Stack Data Flow

```
[Browser] navigates to /admin/foos?page=1&status=active
  → [Route] validateSearch(searchSchema) — Zod from @libs/payload
  → [DataTable] useDataTable → adminFooQueries.list(api, params)
  → [API Client] api.get('/admin/foos', { params })
      ↓ Axios baseURL='/api/v1' → actual request: GET /api/v1/admin/foos?page=1&status=active
      ↓ Vite proxy forwards to http://localhost:8000/api/v1/admin/foos?page=1&status=active
  → [Engine] globalPrefix='api/v1' → matches admin/foos
  → [AuthGuard] checks session cookie → [RolesGuard] checks @Roles(['admin'])
  → [Controller] FooController.list(@Query() query: ListFoosQueryDto)
      ↓ ZodValidationPipe validates query params against payload schema
  → [QueryBus] queryBus.execute(new ListFoosQuery(query))
  → [QueryHandler] ListFoosHandler.execute()
      ↓ @Inject(FOO_REPOSITORY) IFooRepository
  → [Repository] FooRepository.findMany(params)
      ↓ prisma.$queryRawUnsafe or prisma.<model>.findMany + mapToEntity()
  → [WrapResInterceptor] wraps: { code: 0, msg: 'ok', data: { list: [...], total } }
  → [api-core interceptor] unwraps: returns { list: [...], total }
  → [useQuery] receives GetFoosRes → table renders list
  → (on error) AllExceptionsFilter → { code: 4xx, msg: i18n } → ApiError → toast.error()
```
