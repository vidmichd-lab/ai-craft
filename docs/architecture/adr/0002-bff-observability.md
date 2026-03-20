# ADR 0002: Next.js BFF and Request Observability

## Status
Accepted

## Context
The Next.js app acts as the browser-facing backend-for-frontend for auth, templates, media and team management flows.

## Decision
- Route handlers stay thin and delegate business logic to `src/server/*`.
- Every API response should expose an `x-request-id` header.
- Errors are normalized to a stable shape with `error`, `errorCode` and `requestId`.
- Admin mutations emit structured audit logs with actor, action and target metadata.

## Consequences
- Production debugging becomes traceable across logs and client reports.
- Team/admin actions become reviewable without parsing ad hoc console output.
- Future external logging sinks can consume the same structured payloads without another refactor.
