# Auth

## Auth Model

The current auth model is session-based and delegated to the workspace backend.

Canonical files:

- `apps/web/src/server/auth/session.ts`
- `apps/web/src/server/auth/request-session.ts`
- `apps/web/src/server/workspace-api/client.ts`
- `packages/workspace-domain/src/index.ts`
- `serverless/workspace-api/index.mjs`

## Flow

1. Browser submits credentials to the Next.js BFF.
2. BFF forwards auth requests to workspace backend.
3. Workspace backend returns session cookies.
4. BFF forwards cookies back to the browser.
5. Authenticated BFF routes validate session by calling `getWorkspaceMe`.

## Authorization

Current effective roles:

- `editor`
- `lead`
- `admin`
- `isSuperadmin` flag

Canonical authorization helpers:

- `normalizeWorkspaceRole`
- `canManageWorkspaceMembers`
- `canManageWorkspaceTeamSettings`

## Route Enforcement

Use:

- `requireWorkspaceSession`
- `requireWorkspaceRoleSession`
- `requireWorkspaceSuperadminSession`

Do not hand-roll auth logic in route files.

## Security Rules

- Never trust client role claims.
- Re-check session and role on every protected BFF route.
- Do not expose privileged workspace mutations to unauthenticated routes.
- Superadmin-only flows must use the dedicated superadmin guard.

## Current Security Assumptions

- `serverless/workspace-api` is the source of truth for identity and team membership.
- `apps/web` is a trusted BFF but not the source of truth for authorization.
- Client code is untrusted and must not decide privileged access.
