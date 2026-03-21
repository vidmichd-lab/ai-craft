# System Overview

## Purpose

AI-Craft is a layout-generation platform with:

- a browser-facing application shell in `apps/web`
- shared editor, rendering, and workspace packages in `packages/*`
- external workspace and media backends in `serverless/*`
- a legacy static editor in `src/` that still exists for parity and migration support

This document defines the canonical high-level architecture.

## Canonical Runtime

The canonical runtime is the Next.js application in `apps/web`.

It is responsible for:

- rendering the authenticated workspace shell via `apps/web/src/app/page.tsx`
- rendering the public/local editor via `apps/web/src/app/editor/page.tsx`
- providing browser-facing API routes in `apps/web/src/app/api/*`
- acting as a BFF over the workspace and media backends through `apps/web/src/server/*`

## Repository Domains

### Application

- `apps/web/src/app/*`
  - App Router pages, layouts, global CSS, and route handlers
- `apps/web/src/components/*`
  - Product UI organized by domain
- `apps/web/src/server/*`
  - server-only env parsing, API clients, auth/session helpers, services, and response utilities

### Shared packages

- `packages/editor-model/src/index.ts`
  - canonical editor document, snapshot normalization, template serialization
- `packages/editor-renderer/src/index.ts`
  - surface rendering API built on top of the legacy canvas renderer
- `packages/ui/src/*`
  - design tokens, primitives, fields, components, and recipes
- `packages/workspace-domain/src/index.ts`
  - workspace role normalization and authorization helpers
- `packages/workspace-sdk/src/*`
  - typed schemas, OpenAPI-generated types, and workspace helpers

### External backends

- `serverless/workspace-api/index.mjs`
  - workspace data backend
- `serverless/workspace-api/schema.yql`
  - workspace persistence schema
- `serverless/media-api/index.mjs`
  - media manifest and upload backend

### Legacy migration surface

- `src/*`
  - previous static browser application
- `src/renderer.js`
  - legacy bridge into the renderer package
- `src/utils/remoteMediaApi.js`
  - legacy browser client for media operations

New product work must target `apps/web` and `packages/*`. The root `src/` tree exists only to preserve parity during migration.

## Architectural Layers

### Presentation layer

- `apps/web/src/app/*`
- `apps/web/src/components/*`
- `packages/ui/src/*`

### Domain/model layer

- `packages/editor-model/src/index.ts`
- `packages/workspace-domain/src/index.ts`
- `packages/workspace-sdk/src/departments.ts`
- `packages/workspace-sdk/src/schema.ts`

### Rendering layer

- `packages/editor-renderer/src/index.ts`
- `packages/editor-renderer/src/legacy/*`

### BFF/server layer

- `apps/web/src/server/env.ts`
- `apps/web/src/server/auth/*`
- `apps/web/src/server/http/*`
- `apps/web/src/server/services/*`
- `apps/web/src/server/workspace-api/*`
- `apps/web/src/server/media-api/*`

### External infrastructure layer

- `serverless/workspace-api/*`
- `serverless/media-api/*`
- `serverless/web-proxy-gateway/openapi.yaml`

## Current Reality And Audit Outcome

### What was outdated

- The previous root `README.md` described a static Python-served site and did not reflect the current monorepo, Next.js app, packages, tests, or serverless services.
- `CODING_GUIDELINES.md` and `apps/web/ARCHITECTURE.md` reflect older phases and are incomplete relative to the current codebase.
- `DEPLOY.md` documents static bucket hosting only and is not sufficient for the active Next.js plus serverless architecture.

### What was missing

- No single canonical architecture map covering `apps/web`, `packages/*`, `serverless/*`, and legacy `src/*`.
- No enforceable design-system rules tied to `packages/ui`.
- No canonical documentation for auth boundaries, env handling, folder ownership, naming, or deployment responsibilities.

### What was inconsistent

- Documentation language and scope were mixed.
- Historical docs existed in several places without a clear canonical entry point.
- The repo contains both active and legacy UI implementations without a documented source-of-truth hierarchy.

## Canonical Decision Summary

- `apps/web` is the only canonical application shell.
- `packages/*` own reusable contracts and shared implementation.
- `serverless/*` are external backends, not UI layers.
- `src/*` is legacy and must not define new patterns for active development.
- `/docs` is the single source of truth for future changes.
