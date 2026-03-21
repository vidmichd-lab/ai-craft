# Deployment

## Deployment Topology

The active system is not a single static site deployment.

It consists of:

- Next.js web application from `apps/web`
- workspace backend from `serverless/workspace-api`
- media backend from `serverless/media-api`
- API gateway layer from the corresponding OpenAPI specs

## Web App Deployment

Canonical build characteristics:

- Next.js 15
- `output: 'standalone'` in `apps/web/next.config.ts`

Implication:

- deploy the web app as a standalone Next.js server artifact, not as the old static bucket-only site

## Workspace Backend Deployment

Reference files:

- `serverless/workspace-api/deploy.sh`
- `serverless/workspace-api/gateway.openapi.yaml`
- `serverless/workspace-api/index.mjs`
- `serverless/workspace-api/config.mjs`

Requirements:

- configured storage mode
- valid JWT secret
- YDB settings for production mode
- correct allowed origins and cookie settings

## Media Backend Deployment

Reference files:

- `serverless/media-api/deploy.sh`
- `serverless/media-api/gateway.openapi.yaml`
- `serverless/media-api/README.md`

Requirements:

- object storage bucket
- storage credentials or service-account-backed access
- correct CORS settings
- correct upload policy

## Legacy Deployment Note

`DEPLOY.md` documents the historical static-site bucket flow. Keep it only as legacy reference unless a specific environment still serves the old root static app.

## Deployment Rules

- Do not deploy `apps/web` as if it were the old Python/static root app.
- Keep web and backend env configuration aligned.
- Treat workspace and media services as separate deployable units.
- Validate auth, upload, and template flows after deployment.
- The web app must receive explicit `WORKSPACE_API_BASE_URL` and `MEDIA_MANIFEST_URL` at deploy time. Runtime code no longer provides production fallbacks.
- Treat deploy-script defaults as operational convenience only. Canonical runtime requirements are defined in `docs/setup/env.md`.
