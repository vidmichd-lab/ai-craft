# Data Flow

## End-To-End Flow Map

This document defines how data moves through the system.

## 1. Initial Workspace Page Load

Flow:

1. Browser requests `/`.
2. `apps/web/src/app/page.tsx` reads cookies via `next/headers`.
3. `getWorkspaceDashboard` in `apps/web/src/server/workspace-api/dashboard.ts` loads:
   - session from `apps/web/src/server/auth/session.ts`
   - current team via `getCurrentWorkspaceTeam`
   - team members via `getWorkspaceTeamMembers`
4. The page renders either:
   - `WorkspaceShell` for authenticated users
   - `LoginScreen` for anonymous users

## 2. Login Flow

Browser flow:

1. User submits login form from `apps/web/src/components/auth/login-screen.tsx`.
2. Frontend calls `POST /api/auth/login`.
3. `apps/web/src/app/api/auth/login/route.ts` validates input and calls `loginWorkspace`.
4. `apps/web/src/server/workspace-api/client.ts` forwards the request to the workspace backend.
5. Workspace backend returns session cookies.
6. BFF returns JSON plus forwarded `set-cookie` headers.
7. Browser refreshes into authenticated workspace state.

## 3. Authenticated Session Flow

Every authenticated BFF mutation or read follows this pattern:

1. Route handler calls `requireWorkspaceSession`, `requireWorkspaceRoleSession`, or `requireWorkspaceSuperadminSession`.
2. Session helper calls `getWorkspaceMe` against the workspace backend.
3. Role is normalized via `packages/workspace-domain/src/index.ts`.
4. Route either rejects the request or proceeds.

## 4. Template Save Flow

Primary files:

- `apps/web/src/components/auth/editor-shell.tsx`
- `apps/web/src/app/api/templates/save/route.ts`
- `apps/web/src/server/workspace-api/templates.ts`
- `packages/editor-model/src/index.ts`

Flow:

1. User saves a template from the editor UI.
2. BFF route validates payload.
3. Payload is normalized into stored template state using:
   - `createStoredTemplateState`
   - `normalizeStoredTemplateState`
4. BFF ensures the special template-storage project exists with `ensureTemplateProject`.
5. BFF saves a snapshot of kind `template` through the workspace backend.
6. Audit log entry `template.save` is emitted.

## 5. Media Manifest Flow

Primary files:

- `apps/web/src/app/api/media/manifest/route.ts`
- `apps/web/src/server/media-api/client.ts`
- `apps/web/src/server/media-api/manifest.ts`

Flow:

1. UI requests `/api/media/manifest`.
2. BFF fetches raw manifest from the media backend.
3. `flattenMediaManifest` converts nested remote data into UI-ready groups.
4. Route returns `{ ok: true, groups }`.

## 6. Media Upload Flow

Primary files:

- `apps/web/src/app/api/media/upload/route.ts`
- `apps/web/src/server/media-api/client.ts`

Flow:

1. Authorized user uploads a file through the workspace UI.
2. BFF validates:
   - role
   - folder names
   - MIME type
   - max file size
3. BFF requests a presigned upload from the media backend.
4. BFF performs the actual object upload to the returned URL.
5. BFF emits `media.upload` audit log.
6. BFF returns uploaded object metadata to the UI.

## 7. Editor Rendering Flow

Primary files:

- `packages/editor-model/src/index.ts`
- `packages/editor-renderer/src/index.ts`
- `packages/editor-renderer/src/legacy/render-to-canvas.js`
- `apps/web/src/components/auth/editor-preview.tsx`

Flow:

1. UI edits a canonical `EditorDocument`.
2. Document is normalized into snapshot-compatible state.
3. Renderer resolves asset URLs relative to the provided asset base.
4. Renderer loads logo/background/KV images.
5. Renderer delegates into legacy canvas render code.
6. Render output is produced for predefined preview surfaces.

## 8. Team Defaults And Department Flow

Primary files:

- `apps/web/src/app/api/team/departments/route.ts`
- `apps/web/src/server/services/team-departments.ts`
- `packages/workspace-sdk/src/departments.ts`

Flow:

1. Team admin updates or removes a department.
2. BFF validates the action.
3. Current team defaults are loaded from workspace backend.
4. Department collection is updated via shared workspace helpers.
5. New defaults are persisted back to workspace backend.
6. Audit log entry is emitted.

## Canonical Data Ownership

- Editor document shape: `packages/editor-model`
- Workspace auth/session payloads: `@ai-craft/workspace-sdk`
- Workspace role logic: `packages/workspace-domain`
- Shared UI tokens: `packages/ui`
- Source-of-record persistence: `serverless/workspace-api`
- Source-of-record media storage: `serverless/media-api`

No UI file may redefine those ownership boundaries.
