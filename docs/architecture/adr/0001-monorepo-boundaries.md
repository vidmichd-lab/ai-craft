# ADR 0001: Monorepo Package Boundaries

## Status
Accepted

## Context
AI-Craft is moving from a legacy browser monolith to a structured monorepo with a Next.js web app and shared packages.

## Decision
- `apps/web` is the only primary web application shell.
- Shared domain and renderer concerns live in `packages/*`.
- Generated artifacts such as `.next`, `coverage`, `dist-types`, browser screenshots and packaged zip files are not committed.
- Type contracts are owned by shared packages instead of being redefined inside UI modules.

## Consequences
- Package imports are explicit and easier to review.
- CI can run lint, typecheck and tests per package boundary.
- Legacy runtime may still exist during migration, but it is no longer the architectural center.
