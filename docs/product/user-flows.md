# User Flows

## 1. Anonymous To Authenticated Workspace

1. User opens `/`.
2. `LoginScreen` is shown if no valid workspace session exists.
3. User submits team slug, email, and password.
4. BFF performs login and forwards session cookies.
5. Page reloads into `WorkspaceShell`.

## 2. Edit In Authenticated Workspace

1. Authenticated user lands in workspace shell.
2. `WorkspaceContent` initializes editor document.
3. User edits content, layout, and assets in `EditorShell`.
4. Preview updates through shared editor model and renderer package.

## 3. Save Template

1. User opens the editor in workspace mode.
2. User triggers template save.
3. Current document is normalized and saved through `/api/templates/save`.
4. Template appears in the templates library.

## 4. Apply Template

1. User opens templates overlay.
2. Templates are fetched from `/api/templates`.
3. User selects a template.
4. Stored template state is normalized back into editor document.
5. Editor shell updates immediately.

## 5. Upload And Apply Media

1. Authorized user opens media library.
2. UI loads grouped media manifest.
3. User uploads a file if permitted.
4. BFF validates and uploads through media backend.
5. User applies the selected asset to background, logo, or KV.

## 6. Manage Team

1. Superadmin opens team settings.
2. User creates members, changes roles, resets passwords, or removes users.
3. Department changes are persisted into team defaults.
4. All mutations emit audit logs.

## 7. Public Editor Local Draft

1. User opens `/editor`.
2. Local draft is restored from `localStorage`.
3. User edits the scene without workspace auth.
4. User exports JSON or imports a JSON draft.
5. Draft continues to autosave locally.
