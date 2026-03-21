# Backend Architecture

## Overview

The browser-facing backend layer lives inside `apps/web/src/server/*` and `apps/web/src/app/api/*`.

The system also depends on external serverless services:

- `serverless/workspace-api`
- `serverless/media-api`

The Next.js app is therefore a BFF, not the system-of-record backend.

## BFF Structure

### Route handlers

Location:

- `apps/web/src/app/api/*`

Current domains:

- auth
- account
- team
- templates
- media
- health

Responsibilities:

- parse request payloads with `zod`
- create request context
- enforce session or role requirements
- call server services or API clients
- normalize responses

Examples:

- `apps/web/src/app/api/auth/login/route.ts`
- `apps/web/src/app/api/account/profile/route.ts`
- `apps/web/src/app/api/team/settings/route.ts`
- `apps/web/src/app/api/templates/save/route.ts`
- `apps/web/src/app/api/media/upload/route.ts`

### Server modules

Location:

- `apps/web/src/server/*`

Responsibilities by folder:

- `auth/*`
  - session retrieval and role-based access checks
- `http/*`
  - request IDs, error mapping, response helpers
- `workspace-api/*`
  - typed BFF client to workspace backend
- `media-api/*`
  - typed BFF client to media backend and manifest flattening
- `services/*`
  - multi-step domain operations and audit logging
- `observability/*`
  - audit trail logging
- `env.ts`
  - runtime env parsing and validation

## External Backends

### Workspace API

Primary entrypoint:

- `serverless/workspace-api/index.mjs`

Supporting files:

- `serverless/workspace-api/schema.yql`
- `serverless/workspace-api/gateway.openapi.yaml`
- `serverless/workspace-api/config.mjs`
- `serverless/workspace-api/http.mjs`
- `serverless/workspace-api/auth.mjs`
- `serverless/workspace-api/admin.mjs`
- `serverless/workspace-api/team.mjs`
- `serverless/workspace-api/projects.mjs`
- `serverless/workspace-api/storage-memory.mjs`
- `serverless/workspace-api/storage-ydb.mjs`
- `serverless/workspace-api/storage-ydb-client.mjs`
- `serverless/workspace-api/storage-ydb-normalizers.mjs`

Current responsibilities:

- login/logout/session handling
- user/team/project/snapshot persistence
- team defaults and department storage
- RBAC decisions based on memberships and superadmin rules

Current module shape:

- `index.mjs`
  - request routing and module wiring only
- `config.mjs`
  - env parsing, config normalization, timestamps and clone helpers
- `http.mjs`
  - origin detection, headers and JSON error responses
- `auth.mjs`
  - login, register, logout, session lookup and account profile mutation
- `admin.mjs`
  - superadmin team/user/defaults handlers
- `team.mjs`
  - current-team, member-list and team-default routes
- `projects.mjs`
  - project and snapshot handlers
- `storage-memory.mjs`
  - local in-memory adapter for development and fallback mode
- `storage-ydb*.mjs`
  - YDB-backed persistence adapter, driver/query primitives and row mapping

Current migration status:

- route-level decomposition is complete
- storage-level decomposition is partial
- `storage-ydb.mjs` is still a large adapter and remains the next backend refactor target

### Media API

Primary implementation:

- `serverless/media-api/index.mjs`

Supporting files:

- `serverless/media-api/gateway.openapi.yaml`

Current responsibilities:

- media manifest generation
- presigned upload issuance
- object publishing
- managed object deletion

## API Structure

### Workspace BFF client

Defined in `apps/web/src/server/workspace-api/client.ts`.

It owns:

- cookie forwarding
- request execution
- status normalization
- schema parsing through `@ai-craft/workspace-sdk`
- required env resolution through `apps/web/src/server/env.ts`

This file is the single place where `apps/web` talks to the workspace backend.

### Media BFF client

Defined in `apps/web/src/server/media-api/client.ts`.

It owns:

- manifest URL normalization
- auth token injection for mutations
- request execution
- error normalization
- required env resolution through `apps/web/src/server/env.ts`

This file is the single place where `apps/web` talks to the media backend.

## Auth And Authorization Shape

### Session retrieval

- `apps/web/src/server/auth/session.ts`
- `apps/web/src/server/auth/request-session.ts`

### Role helpers

- `packages/workspace-domain/src/index.ts`

Current role model:

- `editor`
- `lead`
- `admin`
- `isSuperadmin` as elevated authority flag

Current route policy examples:

- authenticated user:
  - `apps/web/src/app/api/templates/route.ts`
- role-restricted user:
  - `apps/web/src/app/api/media/upload/route.ts`
- superadmin only:
  - `apps/web/src/app/api/team/settings/route.ts`

## Observability And Error Shape

Canonical files:

- `apps/web/src/server/http/request-context.ts`
- `apps/web/src/server/http/response.ts`
- `apps/web/src/server/observability/audit.ts`

Guaranteed response behavior for BFF routes:

- responses include `x-request-id`
- errors use `{ error, errorCode, requestId }`
- admin and mutation flows emit structured audit logs

## Enforceable Backend Rules

- Route handlers must stay thin.
- Business logic belongs in `apps/web/src/server/services/*` or shared packages.
- Env access must go through `apps/web/src/server/env.ts`.
- Upstream workspace/media HTTP calls must go through their server clients, never directly from route handlers or UI.
- All request payloads must be validated.
- All nontrivial mutations must emit audit logs.
- Frontend code must never call `serverless/*` directly.
- `serverless/workspace-api/index.mjs` must remain a router/composition root, not a new monolith.
- New workspace backend persistence logic must go into storage modules, not back into route modules.
