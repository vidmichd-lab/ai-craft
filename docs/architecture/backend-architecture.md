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

Primary implementation:

- `serverless/workspace-api/index.mjs`

Supporting files:

- `serverless/workspace-api/schema.yql`
- `serverless/workspace-api/gateway.openapi.yaml`
- `serverless/workspace-api/runtime-security.mjs`

Current responsibilities:

- login/logout/session handling
- user/team/project/snapshot persistence
- team defaults and department storage
- RBAC decisions based on memberships and superadmin rules

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

This file is the single place where `apps/web` talks to the workspace backend.

### Media BFF client

Defined in `apps/web/src/server/media-api/client.ts`.

It owns:

- manifest URL normalization
- auth token injection for mutations
- request execution
- error normalization

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
