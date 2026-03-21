# AI-Craft Legacy Parity Map

This document tracks how the old DOM-driven workspace in [`/Users/vidmich/Desktop/prac/src/ui/components/workspacePanel.js`](#/Users/vidmich/Desktop/prac/src/ui/components/workspacePanel.js) maps to the current React studio runtime in [`/Users/vidmich/Desktop/prac/apps/web`](#/Users/vidmich/Desktop/prac/apps/web).

The goal is to remove legacy runtime entrypoints only after each behavior is confirmed in React.

## Runtime status

- **Future runtime:** [`/Users/vidmich/Desktop/prac/apps/web`](#/Users/vidmich/Desktop/prac/apps/web)
- **Reference-only runtime:** [`/Users/vidmich/Desktop/prac/src`](#/Users/vidmich/Desktop/prac/src)
- **Canonical UI package:** [`/Users/vidmich/Desktop/prac/packages/ui`](#/Users/vidmich/Desktop/prac/packages/ui)

## Surface mapping

### Main editor shell
- Legacy source:
  - [`/Users/vidmich/Desktop/prac/src/ui/components/workspacePanel.js`](#/Users/vidmich/Desktop/prac/src/ui/components/workspacePanel.js)
  - [`/Users/vidmich/Desktop/prac/src/ui/components/sizesAdmin.js`](#/Users/vidmich/Desktop/prac/src/ui/components/sizesAdmin.js)
- React target:
  - [`/Users/vidmich/Desktop/prac/apps/web/src/components/auth/editor-shell.tsx`](#/Users/vidmich/Desktop/prac/apps/web/src/components/auth/editor-shell.tsx)
  - [`/Users/vidmich/Desktop/prac/apps/web/src/components/auth/editor-preview.tsx`](#/Users/vidmich/Desktop/prac/apps/web/src/components/auth/editor-preview.tsx)
  - [`/Users/vidmich/Desktop/prac/apps/web/src/components/auth/workspace-content.tsx`](#/Users/vidmich/Desktop/prac/apps/web/src/components/auth/workspace-content.tsx)
- Status:
  - left rail, center canvas, right export rail and bottom template strip exist in React
  - public `/editor` and authenticated `/` share the same shell language

### Templates surface
- Legacy source:
  - template modal and projects workflows in [`/Users/vidmich/Desktop/prac/src/ui/components/workspacePanel.js`](#/Users/vidmich/Desktop/prac/src/ui/components/workspacePanel.js)
- React target:
  - [`/Users/vidmich/Desktop/prac/apps/web/src/components/auth/templates-library.tsx`](#/Users/vidmich/Desktop/prac/apps/web/src/components/auth/templates-library.tsx)
  - overlay host in [`/Users/vidmich/Desktop/prac/apps/web/src/components/auth/workspace-content.tsx`](#/Users/vidmich/Desktop/prac/apps/web/src/components/auth/workspace-content.tsx)
- Status:
  - library and apply flow are active in React
  - save-current-scene entry now lives in the editor template strip

### Media surface
- Legacy source:
  - media/file-manager interactions in [`/Users/vidmich/Desktop/prac/src/ui/components/workspacePanel.js`](#/Users/vidmich/Desktop/prac/src/ui/components/workspacePanel.js)
- React target:
  - [`/Users/vidmich/Desktop/prac/apps/web/src/components/auth/media-library.tsx`](#/Users/vidmich/Desktop/prac/apps/web/src/components/auth/media-library.tsx)
  - overlay host in [`/Users/vidmich/Desktop/prac/apps/web/src/components/auth/workspace-content.tsx`](#/Users/vidmich/Desktop/prac/apps/web/src/components/auth/workspace-content.tsx)
- Status:
  - group browsing, upload, and apply-as-background/logo/KV flows are active in React

### Team/admin surface
- Legacy source:
  - settings sidebar and admin views in [`/Users/vidmich/Desktop/prac/src/ui/components/workspacePanel.js`](#/Users/vidmich/Desktop/prac/src/ui/components/workspacePanel.js)
- React target:
  - [`/Users/vidmich/Desktop/prac/apps/web/src/components/auth/team-settings.tsx`](#/Users/vidmich/Desktop/prac/apps/web/src/components/auth/team-settings.tsx)
  - overlay host in [`/Users/vidmich/Desktop/prac/apps/web/src/components/auth/workspace-content.tsx`](#/Users/vidmich/Desktop/prac/apps/web/src/components/auth/workspace-content.tsx)
- Status:
  - team settings, departments, and members CRUD are active in React
  - next cleanup target is visual parity and removal of leftover legacy information architecture

### Account surface
- Legacy source:
  - profile/general settings modal in [`/Users/vidmich/Desktop/prac/src/ui/components/workspacePanel.js`](#/Users/vidmich/Desktop/prac/src/ui/components/workspacePanel.js)
- React target:
  - [`/Users/vidmich/Desktop/prac/apps/web/src/components/auth/profile-form.tsx`](#/Users/vidmich/Desktop/prac/apps/web/src/components/auth/profile-form.tsx)
  - account overlay in [`/Users/vidmich/Desktop/prac/apps/web/src/components/auth/workspace-content.tsx`](#/Users/vidmich/Desktop/prac/apps/web/src/components/auth/workspace-content.tsx)
- Status:
  - `Обо мне / Общее` split exists in React
  - local theme/language preferences are now stored in the browser

## What is explicitly not migrating

These legacy techniques should not cross into the React runtime:

- `innerHTML` rendering
- DOM bootstrap
- event delegation
- [`/Users/vidmich/Desktop/prac/src/ui/uiLibraryBridge.js`](#/Users/vidmich/Desktop/prac/src/ui/uiLibraryBridge.js)
- static init hooks from [`/Users/vidmich/Desktop/prac/src/main.js`](#/Users/vidmich/Desktop/prac/src/main.js)
- one-off CSS hooks that only exist to decorate legacy markup

## Deletion gates

The following files can be deleted only after parity is confirmed by Playwright and manual smoke:

1. [`/Users/vidmich/Desktop/prac/src/ui/uiLibraryBridge.js`](#/Users/vidmich/Desktop/prac/src/ui/uiLibraryBridge.js)
2. unused screen entrypoints in [`/Users/vidmich/Desktop/prac/src/ui/components`](#/Users/vidmich/Desktop/prac/src/ui/components)
3. dead CSS hooks in [`/Users/vidmich/Desktop/prac/styles.css`](#/Users/vidmich/Desktop/prac/styles.css)
4. duplicated serializer/adapter paths that are no longer called by the React studio shell

## Current acceptance gate before deletion

Before removing any legacy entrypoint, all of the following must be green in React:

- login
- editor interaction
- template save/apply
- media upload/apply
- department create/edit/delete
- member create/role/reset/remove
- account profile update
- public `/editor` JSON import/export/reset
