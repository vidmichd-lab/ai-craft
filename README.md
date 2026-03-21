This documentation is the single source of truth.
All code changes must follow rules defined in /docs.

# AI-Craft

AI-Craft is a monorepo for a layout-generation workspace. The active product surface is a Next.js application in `apps/web`, supported by shared packages in `packages/*`, with external workspace and media backends exposed through serverless APIs in `serverless/*`.

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

- `apps/web` is the canonical user-facing application shell.
- `packages/*` own reusable contracts, rendering logic, and shared UI.
- Next.js route handlers must stay thin and delegate to `apps/web/src/server/*`.
- UI must use shared tokens and shared components instead of ad hoc styling.
- The root `src/` legacy app is reference and migration surface, not the target architecture for new work.

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
