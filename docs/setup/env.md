# Environment

## Canonical Env Files

- root example: `.env.example`
- web app example: `apps/web/.env.example`
- workspace backend example: `serverless/workspace-api/.env.example`
- media backend example: `serverless/media-api/.env.example`

## Web App Variables

Defined by `apps/web/src/server/env.ts`:

- `NODE_ENV`
- `WORKSPACE_API_BASE_URL`
- `MEDIA_MANIFEST_URL`
- `MEDIA_MUTATION_TOKEN`

Notes:

- `WORKSPACE_API_BASE_URL` and `MEDIA_MANIFEST_URL` are required integration endpoints.
- The web app no longer hardcodes production fallback URLs in runtime code. These values must be set explicitly in the environment for any integration flow that touches the workspace or media backends.
- `MEDIA_MUTATION_TOKEN` is optional but required for media mutations if the backend is configured to expect it.

## Workspace Backend Variables

Documented in `serverless/workspace-api/.env.example`.

Key groups:

- storage mode
- JWT/session settings
- cookie settings
- bootstrap team and admin settings
- YDB connection settings

## Media Backend Variables

Documented in `serverless/media-api/.env.example`.

Key groups:

- storage credentials
- bucket and prefix settings
- URL TTL and signed URL behavior
- CORS and content-type policy
- upload size limit

## Env Rules

- Add new env variables only when configuration cannot reasonably live in code.
- Every new env variable must be documented in the appropriate `.env.example` and in this file.
- Browser code must never depend on secret values.
- Server env access must be centralized through server modules.
