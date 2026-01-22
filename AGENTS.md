# Repository Guidelines

Central orientation for contributors working inside the neo Nx monorepo. Follow these workspace-wide rules.

## Core projects

- `apps/web` – Marketing Site (@tanstack/react-start)
- `apps/desktop` – Desktop application (Electron)
- `service/engine` - Api service (Nestjs)
- `libs/pg-dao` – Postgresql Database model (Prisma).
- `libs/mongo-dao` - MongoDB model (Mongoose)
- `libs/auth` - Auth module for app and service (Better-auth)
- `libs/ui-shared/src/web` - react components and common styles (Tailwind v4 and Shadcn)
- `libs/payload` - req & res payload validator for app and service (Zod)
- `libs/studio` - page components for desktop and web

## Tooling & Commands

- Install deps: `pnpm install` (Node >= 22.19.0, pnpm >= 10.8.1).
- Dev servers: `pnpm dev:web | dev:desktop | dev:engine`
- Build: `pnpm build:web | build:desktop | build:engine`.
- Tests: `nx test <project>` (Jest/Vitest); `nx e2e <project-e2e>` (Playwright).
- Formatting/Linting: `pnpm lint` (or `pnpm lint:all`), `pnpm format:write`.
- Database helpers: `pnpm db:generate`, `pnpm db:migrate <name>`, `pnpm db:seed` (requires `POSTGRES_DATABASE_URL`).

Always prefer Nx commands (`nx run`, `nx run-many`, `nx affected`) so task graph caching stays effective.

## Coding Standards

- Prettier: 2 spaces, single quotes, no semicolons, width 80. Tailwind + import-sort plugins are enabled; avoid manual formatting changes outside your diff.
- ESLint: respect `@nx/enforce-module-boundaries`. Only import from a project’s public API (lib `src/index.ts`).
- Naming: PascalCase components, camelCase variables/functions, kebab-case filenames (angular style). Group related files by feature.
- TypeScript: no `any`. Prefer interfaces over types, avoid enums (use literal unions or maps). Use guard clauses + early returns for error handling.
- Validation: Zod for payloads/forms. Model expected errors as typed results; rely on error boundaries for unexpected failures.

## Nx-Specific Guidance

- Use the Nx MCP tools exposed in the Codex CLI: `nx_workspace` for topology, `nx_project_details` for project config, `nx_docs` for up-to-date Nx behavior.
- When debugging graph/config issues, always inspect the workspace via `nx_workspace` first.
- Prefer `nx run-many`/`nx affected` when touching multiple projects to leverage computation caching.
