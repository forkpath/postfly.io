# Nx 24 dependency compatibility matrix

Snapshot: 2026-08-08. The current verified workspace baseline is Nx 23.0.1,
Vite 8.1.0, Node 24.14.1 and pnpm 10.25.0. Nx 24 must be upgraded in a
dedicated PR; this file is its fail-closed entry checklist.

## Closed in the compatibility preparation wave

| Dependency edge | Resolution | Verification |
| --- | --- | --- |
| Nx `nxViteTsPaths` | Application builds use Vite 8 native `resolve.tsconfigPaths`; Nx/Vitest project-reference configs use exact `vite-tsconfig-paths` 6.1.1. | All 22 test projects and Web/Desktop/Extension builds pass. |
| Nx `nxCopyAssetsPlugin` | Removed. No affected project had a real Vite build target requiring the declared Markdown copy. | Repository scan contains no deprecated Nx Vite plugin imports. |
| WXT React module -> Vite React plugin | `pnpm.overrides` constrains the already-compatible dependency range to `@vitejs/plugin-react` 6.0.3, removing the incompatible nested 4.7.0 copy. | WXT prepare plus Chrome/Firefox builds emit no React/esbuild/Rolldown deprecation warning. |
| Shared i18n -> WXT IIFE | `import.meta.env` is accessed in a statically replaceable form. | Extension builds emit no `EMPTY_IMPORT_META`; i18n typecheck passes. |
| Nitro -> jiti | Root `jiti` is 2.7.0, satisfying Nitro's `^2.6.1` peer. | Web build passes. |
| unstorage -> ioredis | Root `ioredis` is `^5.11.1`, satisfying `^5.9.3`. | Pulse/Worker tests, typechecks and builds pass. |
| Nest adapters -> reflect-metadata | Root `reflect-metadata` is `^0.2.2`, accepted by Nest 11 and required by RabbitMQ/throttler adapters. | Engine/Pulse/Worker tests, typechecks and builds pass. |

## Open peer gates

These mismatches are intentionally not hidden with broad overrides. Each row
requires an ecosystem-specific upgrade and its own regression matrix.

| Area | Current mismatch | Required decision and proof |
| --- | --- | --- |
| TanStack Start | `@tanstack/react-start-rsc` requires `@rspack/core >=2`, while the workspace resolves 1.6.8. The isolated auth-schema tool also includes a `vitefu` range that does not declare Vite 8. | Align the TanStack Start/RSC/plugin family as one change. Decide whether RSC/Rspack is actually used before adding Rspack 2. Re-run Web SSR, preview and production smoke. |
| Tailwind Vite | `@tailwindcss/vite` 4.1.18 declares Vite 5-7 while Desktop and Extension run Vite 8. | Upgrade only when Tailwind publishes a Vite 8-compatible peer range, or deliberately align the whole Vite stack. Re-run CSS visual smoke and both extension archives. |
| Mobile test/navigation | Detox's Wix adapter expects Jest `expect` <=29 while the workspace has 30.2. Expo Router resolves React Navigation 7.1.33 while nested packages request >=7.2.2. | Use the Expo SDK-recommended dependency set and Detox compatibility table; run Android/iOS export plus device E2E. |
| Mobile native menus | Zeego requests exact older `react-native-ios-context-menu` and `react-native-ios-utilities` peers. | Align through a Zeego/Expo-compatible release and run iOS native menu smoke. |
| Electron packaging | Electron Forge plugin-fuses 7.10.2 requests `@electron/fuses` 1.x while the app resolves 2.0.0. | Align Forge/fuses in the packaging wave and verify make, signing configuration and launch on clean macOS/Windows runners. |

## Non-peer maintenance queue

Install also reports deprecated direct or transitive packages, notably
`@types/helmet`, `@react-email/components` 1.0.4 and Recharts 2.x. They do not
block the current migration runtime, but each direct dependency must be removed
or upgraded in a focused PR before treating dependency installation warnings as
a release gate.

pnpm also reports blocked install scripts for the Better Auth CLI's isolated
`@prisma/client` 5.22.0 and optional/peer `better-sqlite3`. They remain denied:
the production Prisma client is 7.8.0, the repository does not use SQLite, and
both `auth:schema-check` and `pg-dao:validate` pass without those scripts. Do not
add either package to `onlyBuiltDependencies` unless a future workflow proves a
real need and reviews the exact package/version script first.

## Nx 24 entry and exit gates

Entry:

1. Every open row above has an owner and an approved upgrade decision.
2. `pnpm install --frozen-lockfile` has no unexplained new peer mismatch.
3. The current Nx 23 full no-cache matrix is green and recorded.

Exit:

1. Run the generated `nx migrate` changes in a dedicated branch; do not mix
   database, auth schema or release behavior changes.
2. Project graph has no cycles or missing tag dimensions.
3. Full no-cache `lint,typecheck,test,build` passes, followed by a second run
   proving deterministic local/remote cache hits.
4. Affected leaf/shared/config/env probes match the recorded baseline.
5. Web production smoke, Extension Chrome/Firefox build, Desktop bundle and
   Mobile Android/iOS export all pass.
