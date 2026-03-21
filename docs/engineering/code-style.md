# Code Style

## Languages And Frameworks

Current primary stack:

- TypeScript for `apps/web` and shared packages
- React 19
- Next.js 15 App Router
- CSS modules plus shared CSS token/theme files
- JavaScript remains in legacy root `src/*` and in renderer/serverless legacy surfaces

## Formatting And Static Analysis

Primary config files:

- `eslint.config.mjs`
- `apps/web/eslint.config.mjs`
- `tsconfig.json`
- `apps/web/tsconfig.json`

## Enforceable Rules

### Imports

- Import from package entry points, not deep random internals, unless the internal file is the intentional owner.
- Use the `@/*` alias inside `apps/web`.
- Use package aliases such as `@ai-craft/ui` and `@ai-craft/editor-model` instead of relative cross-package paths.

### Types

- Shared contracts belong in shared packages.
- Do not redefine workspace API payloads or editor document shapes inside UI code.
- Validate runtime inputs with `zod` at boundaries.

### Functions

- Keep route handlers thin.
- Move multi-step business flows into `apps/web/src/server/services/*`.
- Prefer small pure helpers in shared packages for normalization logic.

### Error handling

- All route errors must go through `toRouteErrorResponse`.
- Include request context for traceability.
- Preserve stable error shape for clients.

### Styling

- Follow `docs/design-system/ui-rules.md`.
- New inline styles are forbidden outside documented legacy exceptions.

### Testing

- Add or update tests when changing shared contracts, renderer behavior, or security-sensitive flows.
- Prefer package-level unit tests for pure logic and Playwright for end-to-end behavior.

## What Not To Do

- Do not place business logic in Next.js page files.
- Do not call upstream backends directly from client components.
- Do not import from root `src/*` into `apps/web`.
- Do not add new untyped JSON boundary handling when a schema already exists.
