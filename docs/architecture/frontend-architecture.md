# Frontend Architecture

## Canonical Frontend

The canonical target frontend and current primary frontend is the Next.js App Router application in `apps/web`.

Primary entry points:

- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/page.tsx`
- `apps/web/src/app/editor/page.tsx`
- `apps/web/src/app/globals.css`

## Layer Status

| Layer | Current status | Known debt |
| --- | --- | --- |
| Route layer | Active | Some routes still closely mirror backend transport |
| Product components | Active | Some large components still need further decomposition |
| Shared UI | Active but incomplete | Transitional inline style usage still exists |
| Legacy static frontend | Migration-only | Still useful for parity and reference |

## Frontend Composition

### Route layer

Owned by `apps/web/src/app/*`.

Responsibilities:

- route definitions
- server component entry points
- composition of page-level shells
- browser-facing API handlers under `apps/web/src/app/api/*`

Rules:

- Keep pages thin.
- Do not place business logic in route files or page files.
- Route files may parse input and compose services, but they do not own domain rules.

### Product component layer

Owned by `apps/web/src/components/*`.

Current feature groupings:

- `apps/web/src/components/auth/*`
  - login, workspace shell, templates, media, team settings, account/profile
- `apps/web/src/components/editor/*`
  - public editor workbench

Key components:

- `apps/web/src/components/auth/login-screen.tsx`
- `apps/web/src/components/auth/workspace-shell.tsx`
- `apps/web/src/components/auth/workspace-content.tsx`
- `apps/web/src/components/auth/editor-shell.tsx`
- `apps/web/src/components/editor/public-editor-workbench.tsx`

Rules:

- Components in `apps/web/src/components/*` compose shared package APIs.
- They may own product-specific CSS modules.
- They must not reimplement shared primitives already present in `packages/ui`.

### Shared UI layer

Owned by `packages/ui/src/*`.

Exports:

- `packages/ui/src/primitives.tsx`
- `packages/ui/src/fields.tsx`
- `packages/ui/src/components.tsx`
- `packages/ui/src/recipes.tsx`
- `packages/ui/src/theme.css`
- `packages/ui/src/sds-tokens.css`

Rules:

- Shared primitives and tokens must be defined here, not duplicated in `apps/web`.
- Product-specific layout classes belong in app CSS modules, not in the UI package.

## Editor Architecture

The editor experience is split between model, rendering, and product shell:

- model: `packages/editor-model/src/index.ts`
- renderer: `packages/editor-renderer/src/index.ts`
- product shell: `apps/web/src/components/auth/editor-shell.tsx`
- public workbench wrapper: `apps/web/src/components/editor/public-editor-workbench.tsx`

`packages/editor-model` owns the normalized document format.

`packages/editor-renderer` owns rendering to canvas surfaces.

`EditorShell` composes the form and preview UI around that model and renderer.

## Styling Architecture

Current styling sources:

- global app foundation: `apps/web/src/app/globals.css`
- product-specific CSS modules:
  - `apps/web/src/components/auth/login-screen.module.css`
  - `apps/web/src/components/auth/workspace-shell.module.css`
- shared design tokens and component styles:
  - `packages/ui/src/sds-tokens.css`
  - `packages/ui/src/theme.css`

Canonical rule:

- product UI styling must flow from shared tokens in `packages/ui/src/sds-tokens.css`
- then shared component styles in `packages/ui/src/theme.css`
- then feature/page CSS modules in `apps/web`

Legacy direct style mutation in root `src/*` is not a valid model for new frontend work.

## Dependency Rules Matrix

| From | Can import |
| --- | --- |
| `apps/web/src/app/*` | `apps/web/src/components/*`, `apps/web/src/server/*`, shared packages |
| `apps/web/src/components/*` server component | shared packages, safe server modules |
| `apps/web/src/components/*` client component | shared packages only, no server runtime imports |
| `apps/web/src/server/*` | shared packages, upstream clients, server-local modules |
| `packages/ui/*` | React and token/theme files only, no app/server imports |
| `src/*` | legacy-local modules only |

## Client/Server Boundary

| Concern | Client | Server |
| --- | --- | --- |
| UI state | browser-owned | no |
| session/auth verification | no | `apps/web/src/server/auth/*` |
| upstream workspace/media access | no | `apps/web/src/server/workspace-api/*`, `apps/web/src/server/media-api/*` |
| secret access | no | `apps/web/src/server/env.ts` |
| editor model and renderer | yes | only as build/runtime dependency, not as auth source |

## Frontend Boundaries

Allowed imports for `apps/web/src/components/*`:

- `@ai-craft/editor-model`
- `@ai-craft/editor-renderer`
- `@ai-craft/ui`
- `@ai-craft/workspace-domain`
- `@ai-craft/workspace-sdk`
- `@/server/*` only from server components or route handlers, not from client components unless the import is type-only and safe

Disallowed patterns:

- importing from `serverless/*` directly into frontend code
- importing from root legacy `src/*` into `apps/web`
- redefining shared tokens or workspace DTOs inside UI code

## Known Migration Debt

- Some UI contract coverage is still incomplete in `packages/ui`.
- Some styling remains transitional rather than fully tokenized.
- Root legacy code is still referenced for parity and historical behavior.
- Some large client components still combine orchestration and view concerns.

## Migration Stance

The root `src/*` frontend remains in the repository, but it is not the target architecture.

Migration guidance:

- reuse its rendering behavior only through `packages/editor-renderer`
- port durable logic into shared packages
- do not add new product features directly to root `src/*` unless the task is explicitly legacy maintenance
