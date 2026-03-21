# Secrets

## Where Secrets Belong

Secrets belong in environment variables and platform secret stores, not in source code.

Canonical env parsing point for the web app:

- `apps/web/src/server/env.ts`

Serverless examples:

- `serverless/workspace-api/.env.example`
- `serverless/media-api/.env.example`

## Current Secret-Carrying Variables

### Web app

- `MEDIA_MUTATION_TOKEN`

### Workspace backend

- `WORKSPACE_JWT_SECRET`
- `WORKSPACE_BOOTSTRAP_ADMIN_PASSWORD`
- `YDB_AUTH_TOKEN`

### Media backend

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

## Rules

- Never hardcode secrets in source files.
- Never commit populated `.env` files intentionally.
- Only access env through dedicated server modules, not scattered `process.env` calls.
- Keep secret-bearing envs server-only.
- Never expose backend credentials to browser code.

## Client/Server Boundary

- `apps/web/src/server/*` may read secrets through `env.ts`.
- `apps/web/src/components/*` and other browser code must never read or depend on secrets.
- Route handlers may use secret-backed server clients, but they must not leak secret values in responses.

## Operational Guidance

- Treat `.env.example` files as documentation only.
- Production secrets must be injected by the deployment platform.
- Rotate bootstrap and JWT secrets outside the codebase.
