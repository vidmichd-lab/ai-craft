# Folder Structure

## Canonical Top-Level Ownership

### `apps/`

Application runtimes.

- `apps/web`
  - canonical web product and BFF

### `packages/`

Shared reusable code.

- `packages/editor-model`
  - editor document, snapshot, template ownership
- `packages/editor-renderer`
  - rendering ownership
- `packages/ui`
  - design system ownership
- `packages/workspace-domain`
  - role and domain helper ownership
- `packages/workspace-sdk`
  - typed client/schema ownership

### `serverless/`

External service implementations and gateway specs.

- `serverless/workspace-api`
- `serverless/media-api`
- `serverless/web-proxy-gateway`

### `src/`

Legacy static app kept for migration support and parity only.

### `docs/`

Canonical documentation.

### `tests/`

Cross-system tests and regression coverage.

## Canonical `apps/web` Structure

### `apps/web/src/app`

Owns:

- route files
- server page entry points
- global CSS
- browser-facing API handlers

### `apps/web/src/components`

Owns:

- product-specific React components
- feature shells
- CSS modules for those components

### `apps/web/src/server`

Owns:

- server-only modules
- env parsing
- auth/session helpers
- upstream clients
- server services
- request/response utilities

### `apps/web/src/figma`

Owns generated Figma Code Connect files only.

## Placement Rules

- New reusable visual components go to `packages/ui`.
- New shared business/domain helpers go to the appropriate package under `packages/*`.
- New BFF-only integration logic goes to `apps/web/src/server`.
- New product UI flows go to `apps/web/src/components`.
- New API route files go to `apps/web/src/app/api`.
- Legacy fixes in root `src/*` must stay isolated and must not become dependencies of `apps/web`.

## Placement Decision Tree

1. Is it a browser-facing route, page, layout, or API handler?
   - Put it in `apps/web/src/app`.
2. Is it product-specific React UI for the active app?
   - Put it in `apps/web/src/components`.
3. Is it reusable across features or apps?
   - Put it in the appropriate package under `packages/*`.
4. Is it server-only integration or business logic for the web app?
   - Put it in `apps/web/src/server`.
5. Is it legacy parity or old runtime maintenance?
   - Keep it under `src/`.

## Examples

- A new workspace modal component:
  - `apps/web/src/components/auth/...`
- A reusable button variant or shared field primitive:
  - `packages/ui/src/...`
- An editor document normalization helper:
  - `packages/editor-model/src/index.ts`
- A BFF wrapper over a workspace endpoint:
  - `apps/web/src/server/workspace-api/...`

## Anti-Examples

- A new shared type defined under `apps/web/src/components`.
- A client component calling the workspace backend directly with `fetch`.
- A new canonical feature added under root `src/`.
- A reusable UI primitive copied into an app feature folder instead of extracted into `packages/ui`.

## Naming Coupled To Placement

- React component files: `kebab-case.tsx`
- Route handlers: `route.ts`
- Shared package entrypoints: `index.ts`
- CSS modules should be paired to the owning component, for example `workspace-shell.module.css`
- See `docs/engineering/naming-conventions.md` for the naming contract that complements placement rules.

## Forbidden Placement

- Do not place shared types in `apps/web/src/components`.
- Do not place route handler logic in `packages/ui`.
- Do not place browser-only code in `apps/web/src/server`.
- Do not add new canonical product code under root `src/*`.
