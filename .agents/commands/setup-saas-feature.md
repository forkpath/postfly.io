# Setup SaaS Feature

Set up a new SaaS feature in the Ray monorepo following project conventions.

## Before starting

1. **Clarify scope**: Which apps need this feature? (web, desktop or both)
2. **Check existing code**: Look in `libs/*` for reusable logic before creating new code
3. **Identify shared vs app-specific**: Shared logic goes in `libs/*`, Mobile UI in app-specific modules，Web and Desktop SPA UI in `libs/studio`

## Feature setup by target

### Web feature

1. **Page/route**: Create in `apps/web/src/routes/{section}/`
   - Marketing pages → `_marketing/`
   - Auth pages → `auth/`
   - App pages → `_app/`

2. **Module**: Create in `libs/studio/src/modules/{feature}/`
   ```
   libs/studio/src/modules/{feature}/
     {child-feature}/    # child feature
     layout/             # Page container Layout
     components/         # React components
     lib/                # Hooks, utils, API calls
     store/              # UI State
     nav-config.tsx      # Navigation Config
   ```
3. **Fetch Data**: Create in `libs/api-client/src/domains`
   ```
   libs/api-client/src/domains
     {feature}/ # api request belongs specified feature
   ```

### Desktop feature

1. **Page/route**: Create in `apps/desktop/src/renderer/routes/{section}/`
   - Auth pages → `auth/`
   - App pages → `_app/`

2. **Module**: Create in `libs/studio/src/modules/{feature}/`
   ```
   libs/studio/src/modules/{feature}/
     {child-feature}/    # child feature
     layout/             # Page container Layout
     components/         # React components
     lib/                # Hooks, utils, API calls
     store/              # UI State
     nav-config.tsx      # Navigation Config
   ```
3. **Fetch Data**: Create in `libs/api-client/src/domains`
   ```
   libs/api-client/src/domains
     {feature}/ # api request belongs specified feature
   ```

### API Endpoint (`services/engine/src`)

Follow this bottom-up order strictly — each layer depends on the one before it.

**Auth boundary**: login, registration, sessions, account linking, email verification, 2FA, and Better Auth organization membership primitives belong to `@libs/auth` / Better Auth. Engine modules may expose admin/business management endpoints, but their domain models must stay aligned with Better Auth fields and delegate auth persistence to infrastructure adapters.

1. **Database model** (`libs/pg-dao/src/models/`)
   - Check if a `.prisma` file for this feature already exists; create one if not
   - Follow conventions: snake_case columns via `@map`, `@@map` for table names, `@@schema("public")`
   - Run `pnpm db:migrate <migration-name>` then `pnpm db:generate` to sync the ORM client

2. **Domain layer** (`services/engine/src/domain/`)
   ```
   domain/
     entities/          # Classes with private state, factory methods, and behaviour
     value-objects/     # Typed wrappers used in entity fields and repository signatures
     repositories/      # Abstract interfaces (e.g. I{Feature}Repository)
     services/          # Pure domain services only when entity methods are insufficient
     specifications/    # Reusable pure business predicates when rules become composable
     exceptions/        # DomainException subclasses with i18nKey + httpStatus
   ```
   - Define entity classes first; interface-only entities are an anti-pattern in engine
   - Entity fields should use value objects where they carry validation or identity semantics
   - Value objects must be used beyond construction; do not create-and-discard them as validation helpers
   - Repository interfaces must only use domain types — never Prisma, NestJS, or `@libs/payload` types
   - Domain code must not import `@nestjs/*`, `@libs/payload`, Prisma, or infrastructure adapters

3. **Application layer** (`services/engine/src/application/`)
   ```
   application/
     use-cases/{feature}/ # Framework-free application orchestration
     commands/{feature}/   # Write operations — one file per command + handler
     queries/{feature}/    # Read operations — one file per query + handler
     dtos/{feature}/       # Request DTOs via nestjs-zod + @libs/payload schemas
     mappers/              # Payload Req → criteria, entity/result → Payload Res
   ```
   - Each command/query file exports both the message class and its `@CommandHandler`/`@QueryHandler`
   - Handlers receive dependencies via `@Inject(FEATURE_REPOSITORY)` — never import infrastructure directly
   - Command handlers are thin adapters: construct/call application use cases, then map results
   - Application use cases orchestrate repository IO and entity behaviour; they do not contain framework decorators
   - **Payload schemas first**: define Zod request/response schemas in `libs/payload/src/schemas/{feature}.schema.ts` using `*ReqSchema` / `*ResSchema` naming. DTOs extend request schemas via `createZodDto(schema)` so validation is shared with the frontend
   - Do not redefine response Zod schemas in engine DTO files; import response types from `@libs/payload`
   - Mappers are static classes with `toCriteria` / `toResponse` / `toResponseList` methods

4. **Infrastructure layer** (`services/engine/src/infrastructure/`)
   ```
   infrastructure/
     repositories/    # Concrete repository implementations (Prisma, Better Auth, etc.)
     services/        # Third-party API integrations (optional)
   ```
   - Implement the domain repository interface using Prisma client
   - Map Prisma models to domain entities inside the repository — the rest of the app never sees Prisma types

5. **Presentation layer** (`services/engine/src/presentation/`)
   ```
   presentation/
     http/{feature}/
       {feature}.controller.ts   # Route handlers dispatching via CommandBus / QueryBus
       {feature}.module.ts        # NestJS module wiring providers, repository bindings, CQRS
     ws/{feature}/                # WebSocket gateway (only if real-time is required)
   ```
   - Controllers are thin: validate input (DTOs), dispatch to bus, return result
   - The module must register command/query handlers, bind `FEATURE_REPOSITORY` to its implementation, and import `CqrsModule`

6. **API client** (`libs/api-client/src/domains/`)
   ```
   domains/
     {feature}.ts   # or {feature}/ for complex features
   ```
   - Define query keys, query option factories, and mutation factories following the existing pattern
   - Import and use the Zod schemas from `@libs/payload` for input validation before requests
   - This step connects the backend endpoint to the frontend — ensure paths and payload shapes match

### Shared logic (`libs/*`)

If the feature needs shared logic across apps:

| Need                             | Location                                |
| -------------------------------- | --------------------------------------- |
| API Request                      | `libs/api-client/src/domains/{feature}` |
| Request Payload Validator        | `libs/payload/src/schemas`              |
| Relation Database schema         | `libs/pg-dao/src/models/`               |
| Document Database Schema         | `libs/mongo-dao/src/schemas`            |
| Auth logic                       | `libs/auth/src/`                        |
| Shared types/utils               | `libs/common/src/`                      |
| Translations                     | `libs/i18n/src/translations/`           |
| Email templates                  | `libs/email/src/templates/`             |
| Primitive Component and UI style | `libs/ui-shared/src`                    |

## Checklist

**Planning**
- [ ] Scope defined (which apps)
- [ ] Checked `libs/*` for existing helpers

**Database**
- [ ] Prisma model exists in `libs/pg-dao/src/models/` and matches requirements
- [ ] Migrations applied (`db:migrate`) and ORM regenerated (`db:generate`)

**Backend (services/engine)**
- [ ] Domain entities, repository interfaces, and exceptions defined
- [ ] Domain entities are classes with behaviour, not plain interfaces
- [ ] Value objects are used in entity fields or repository signatures
- [ ] Repository interfaces do not import `@libs/payload`, Prisma, or NestJS types
- [ ] Domain exceptions extend `DomainException` and define `i18nKey` + `httpStatus`
- [ ] Payload schemas created in `libs/payload/src/schemas/` with `*ReqSchema` / `*ResSchema`
- [ ] Application DTOs extend payload schemas via `createZodDto`
- [ ] Application use cases orchestrate write operations and call entity behaviour
- [ ] Command/query handlers implemented as thin adapters with proper repository injection
- [ ] Mappers convert payload requests to criteria and domain results to payload responses
- [ ] Infrastructure repository implements domain interface using Prisma
- [ ] Controller dispatches via `CommandBus` / `QueryBus` — no direct repository calls
- [ ] NestJS feature module wires all providers and imports `CqrsModule`

**Frontend**
- [ ] API client domain created in `libs/api-client/src/domains/` with keys, queries, mutations
- [ ] Created module structure in target app (`libs/studio/src/modules/`)
- [ ] Added shared logic to appropriate package (if needed)
- [ ] Added translations if user-facing text

**Quality**
- [ ] Types explicit, no `any`
- [ ] Zod schemas for all request/response validation
