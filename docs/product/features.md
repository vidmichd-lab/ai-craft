# Features

## Current Product Scope

Based on the codebase as of this documentation pass, AI-Craft currently provides the following product features.

## Workspace Access

- login screen and authenticated workspace entry
- logout
- current-user profile update

Primary files:

- `apps/web/src/components/auth/login-screen.tsx`
- `apps/web/src/components/auth/logout-button.tsx`
- `apps/web/src/components/auth/profile-form.tsx`

## Workspace Shell

- authenticated workspace shell with team context
- account overlay
- team overlay
- templates overlay
- media overlay

Primary files:

- `apps/web/src/components/auth/workspace-shell.tsx`
- `apps/web/src/components/auth/workspace-content.tsx`

## Editor

- authenticated editor workspace
- public/local editor mode
- canvas previews for multiple surfaces
- JSON import/export in public mode

Primary files:

- `apps/web/src/components/auth/editor-shell.tsx`
- `apps/web/src/components/auth/editor-preview.tsx`
- `apps/web/src/components/editor/public-editor-workbench.tsx`

## Templates

- fetch saved templates
- save current editor state as template
- reapply saved template into editor state

Primary files:

- `apps/web/src/components/auth/templates-library.tsx`
- `apps/web/src/app/api/templates/route.ts`
- `apps/web/src/app/api/templates/save/route.ts`

## Media Library

- fetch remote media manifest
- upload authorized assets
- apply asset into editor document

Primary files:

- `apps/web/src/components/auth/media-library.tsx`
- `apps/web/src/app/api/media/manifest/route.ts`
- `apps/web/src/app/api/media/upload/route.ts`

## Team Management

- view team members
- create users
- change user role
- reset user password
- remove user
- manage departments
- update team settings

Primary files:

- `apps/web/src/components/auth/team-settings.tsx`
- `apps/web/src/app/api/team/*`

## Legacy Feature Surface

The root `src/*` tree still contains a broader static-editor feature surface. It remains useful for migration reference, but it is not the canonical product surface for new work.
