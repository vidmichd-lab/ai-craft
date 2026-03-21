# Data Handling

## Data Boundaries

### Client-managed state

- local editor draft state in `apps/web/src/components/editor/public-editor-workbench.tsx`
- local overlay/theme/language preferences in `apps/web/src/components/auth/workspace-content.tsx`

These are convenience states only, not source-of-record data.

### Shared canonical state

- editor document and template state in `packages/editor-model/src/index.ts`

### Server source-of-record data

- users, teams, memberships, projects, snapshots, team defaults, sessions:
  - `serverless/workspace-api`
- media objects and manifest data:
  - `serverless/media-api`

## Handling Rules

- Validate all incoming HTTP payloads at route boundaries.
- Normalize editor/template payloads before persistence.
- Do not persist raw unvalidated client structures when a canonical model exists.
- Do not treat browser local storage as authoritative workspace data.

## File Upload Handling

Current upload flow:

- browser submits file to BFF
- BFF validates content type and size
- BFF obtains presigned upload
- BFF performs upload

Current constraints in `apps/web/src/app/api/media/upload/route.ts`:

- allowed MIME types are explicitly whitelisted
- max file size is capped at 10 MB
- folder segments are regex-validated

## Logging Rules

- Audit logs may include actor and mutation metadata.
- Secrets, raw credentials, or full tokens must never be logged.
- Request errors must remain structured and traceable.

## Legacy Boundary Note

The root `src/*` legacy application uses local state and browser-side media utilities extensively. That behavior is not a model for new security-sensitive flows in `apps/web`.
