This documentation is the single source of truth.
All code changes must follow rules defined in /docs.

# AI-Craft

AI-Craft is a monorepo for a layout-generation workspace. The active product surface is a Next.js application in `apps/web`, supported by shared packages in `packages/*`, with external workspace and media backends exposed through serverless APIs in `serverless/*`.

## Quick Start

### By Goal

`Run the active web app`

```bash
npm install
npm --prefix apps/web run dev
```

`Run full monorepo checks`

```bash
npm run lint
npm run build
```

`Deploy web`

```bash
cd apps/web
./deploy-serverless-container.sh
```

`Deploy backends`

```bash
cd serverless/workspace-api
bash ./deploy.sh

cd serverless/media-api
bash ./deploy.sh
```

## Documentation

Start here, then move into the relevant section before making changes:

- `docs/architecture/system-overview.md`
- `docs/architecture/frontend-architecture.md`
- `docs/architecture/backend-architecture.md`
- `docs/architecture/data-flow.md`
- `docs/design-system/tokens.md`
- `docs/design-system/components.md`
- `docs/design-system/ui-rules.md`
- `docs/engineering/code-style.md`
- `docs/engineering/folder-structure.md`
- `docs/engineering/naming-conventions.md`
- `docs/security/auth.md`
- `docs/security/data-handling.md`
- `docs/security/secrets.md`
- `docs/product/features.md`
- `docs/product/user-flows.md`
- `docs/setup/installation.md`
- `docs/setup/env.md`
- `docs/setup/deployment.md`

Supporting historical context remains in:

- `docs/architecture/adr/*`
- `docs/design-system-inventory.md`
- `docs/figma-code-connect.md`

Historical documents outside `/docs` are not authoritative unless a canonical document explicitly links to them.

## Where To Work

| If you need to change... | Go here first |
| --- | --- |
| App routes and BFF endpoints | `apps/web/src/app`, `apps/web/src/server` |
| Product UI | `apps/web/src/components` |
| Shared design system | `packages/ui` |
| Editor document/schema | `packages/editor-model` |
| Canvas rendering | `packages/editor-renderer` |
| Workspace API contracts/helpers | `packages/workspace-sdk` |
| Legacy static editor | `src/` |

## Repository Status

| Area | Status |
| --- | --- |
| `apps/web` | Active |
| `packages/*` | Active |
| `serverless/*` | Active |
| `src/` | Legacy / migration-only |
| old static deployment docs | Historical |

## Project Structure

```text
apps/
  web/                  Next.js application and browser-facing BFF
packages/
  editor-model/         Canonical editor document and template model
  editor-renderer/      Canvas renderer and legacy render bridge
  ui/                   Shared UI primitives, fields, components, recipes, tokens
  workspace-domain/     Workspace role and domain helpers
  workspace-sdk/        Typed workspace/media API contracts and helpers
serverless/
  workspace-api/        Workspace backend implementation and schema
  media-api/            Media manifest and upload backend
  web-proxy-gateway/    Gateway specification
src/                    Legacy static application kept for migration/parity
docs/                   Canonical documentation set
tests/                  Unit, integration, security, smoke, and renderer tests
```

## Core Principles

- `apps/web` is the canonical target runtime and current primary application shell.
- `packages/*` own reusable contracts, rendering logic, and shared UI.
- Next.js route handlers must stay thin and delegate to `apps/web/src/server/*`.
- UI must use shared tokens and shared components instead of ad hoc styling.
- The root `src/` legacy app is not the target architecture for new work, but parts of it still remain relevant for migration and parity.

## Local Development

Requirements:

- Node.js 22+
- npm 11+

Install and run:

```bash
npm install
npm run dev
```

Useful commands:

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run test:workspace
npm run test:renderer
npm run build
```

To run only the web app:

```bash
npm --prefix apps/web run dev
```

## Common Commands By Subsystem

| Subsystem | Commands |
| --- | --- |
| Monorepo | `npm run lint`, `npm run build`, `npm run test:unit` |
| Web app | `npm --prefix apps/web run dev`, `npm --prefix apps/web run build` |
| Renderer | `npm run test:renderer` |
| Workspace flows | `npm run test:workspace`, `npm run test:live` |
| Workspace API | `cd serverless/workspace-api && npm run check` |
| Media API | `cd serverless/media-api && npm run check` |

## Runtime Surfaces

- Web app: `apps/web`
- Workspace backend: `serverless/workspace-api`
- Media backend: `serverless/media-api`
- Renderer package: `packages/editor-renderer`
- Legacy static editor: `src/`

## Rules For Future Changes

Before changing code:

1. Read the relevant files in `/docs`.
2. Follow the architecture and folder ownership rules.
3. Reuse the shared design system and tokens.
4. Prefer updating code to match docs instead of relaxing docs.

If current code conflicts with these docs, treat the code as migration debt unless a canonical doc explicitly marks an exception.

## Operational Reality

- `build` is currently the deploy-critical validation.
- `typecheck` is intended to be authoritative, but the current `apps/web` script still has a known local runtime issue around `next typegen`.
- Some documents define the target architecture more strictly than the migration is currently complete; check migration status and exceptions before treating every deviation as a code bug.
