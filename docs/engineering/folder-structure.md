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

Legacy static app kept for migration support only.

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

## Forbidden Placement

- Do not place shared types in `apps/web/src/components`.
- Do not place route handler logic in `packages/ui`.
- Do not place browser-only code in `apps/web/src/server`.
- Do not add new canonical product code under root `src/*`.
