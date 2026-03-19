# Security Best Practices Report

## Executive Summary

The codebase has several meaningful security issues in both the frontend admin tooling and the serverless APIs. The most serious problems are: unauthenticated object-management endpoints in `media-api`, a frontend-only admin password model that uses a default password and stores the secret in `localStorage`, and insecure fallback secrets/bootstrap credentials in `workspace-api`. There is also a stored-XSS path in the admin background renderer because imported background data is written to `localStorage` and later interpolated into `innerHTML` without escaping.

The highest-priority work is to move admin authorization to trusted server-side controls, require real authentication for media mutations, and fail closed when secrets are missing instead of silently falling back to predictable defaults.

## Critical Findings

### SEC-001: `media-api` allows unauthenticated upload, delete, and publish operations

Impact: Anyone who can reach the function endpoint can mint upload URLs, delete managed objects, or move objects between draft and published prefixes without proving identity.

Severity: Critical

Evidence:

- `serverless/media-api/index.mjs:348-423` defines `handlePresignUpload` and issues a signed PUT URL with no authentication or authorization check.
- `serverless/media-api/index.mjs:425-440` defines `handleDeleteObject` and deletes objects based only on the provided key.
- `serverless/media-api/index.mjs:463-489` defines `handlePublishObject` and moves objects between prefixes with no caller verification.
- `serverless/media-api/index.mjs:517-526` routes `POST /media/presign-upload`, `DELETE /media/object`, and `POST /media/publish` directly to those handlers.

Why this matters:

- CORS is not an authentication control. Non-browser clients, scripts running on an allowed origin, or any future SSR/server integration can call these routes directly.
- A leaked or guessed object key is enough to delete or republish content.
- `presign-upload` can be used to store attacker-controlled files in the managed bucket within the allowed MIME set.

Recommended secure-by-default fix:

- Require authenticated workspace sessions or signed backend-to-backend credentials for every mutating media route.
- Enforce authorization at the route level so only trusted roles can upload/delete/publish.
- Scope media actions to team/workspace ownership instead of arbitrary managed keys.
- Consider splitting public manifest reads from privileged mutation endpoints.

## High Findings

### SEC-002: Frontend admin protection is bypassable and stores the password in plaintext

Severity: High

Evidence:

- `src/utils/passwordManager.js:5-6` sets a default admin password of `admin`.
- `src/utils/passwordManager.js:15-21` reads the password directly from `localStorage`.
- `src/utils/passwordManager.js:45-54` writes the password back to `localStorage` in plaintext.
- `src/utils/passwordManager.js:63-66` validates by comparing the raw input to the raw stored password.
- `src/ui/components/sizesAdmin.js:2050-2055` opens the sizes admin with no prompt if the password is disabled.
- `src/ui/components/logoAssetsAdmin.js:1281-1286` does the same for logo/assets admin.

Why this matters:

- Any user with browser devtools can read, change, or remove `localStorage.admin_password`.
- The default password is predictable and weak.
- The gate is entirely client-side, so it does not meaningfully protect sensitive operations once the page is loaded.

Recommended secure-by-default fix:

- Remove the client-side password gate for any action that changes shared or sensitive state.
- Put admin authorization behind the authenticated workspace backend and role checks.
- If a local-only convenience mode must remain, default it to disabled in production builds and never ship a built-in password.
- Do not store passwords or password equivalents in browser storage.

### SEC-003: `workspace-api` silently falls back to predictable JWT and bootstrap credentials

Severity: High

Evidence:

- `serverless/workspace-api/index.mjs:55` falls back to `WORKSPACE_JWT_SECRET='change-me'`.
- `serverless/workspace-api/index.mjs:66-67` falls back to `admin@example.com` / `change-me-now` in memory mode.
- `serverless/workspace-api/index.mjs:558-559` hashes and seeds that bootstrap password into the in-memory store.

Why this matters:

- If these environment variables are omitted in any deployed environment, attackers can forge valid session tokens or log in with the seeded credentials.
- Silent fallback makes misconfiguration easy to miss and turns an operational mistake into an auth compromise.

Recommended secure-by-default fix:

- Fail startup when `WORKSPACE_JWT_SECRET` is missing or weak.
- Remove default bootstrap credentials from runtime code.
- Gate bootstrap user creation behind explicit one-time setup variables or a dedicated setup flow.
- Add deployment checks that reject known-placeholder secrets.

### SEC-004: Imported background data can trigger stored XSS in the admin UI

Severity: High

Evidence:

- `src/utils/fullConfig.js:171-173` imports `config.adminBackgrounds` directly into `localStorage`.
- `src/utils/fullConfig.js:253-254` also trusts `config.adminBackgrounds` when loading from `config.json`.
- `src/ui/components/sizesAdmin.js:1948-1953` and `src/ui/components/sizesAdmin.js:4859-4864` render `bg.bgImage` and `bg.bgColor` into `innerHTML` without escaping.

Why this matters:

- A malicious imported config can store attacker-controlled strings that are later inserted into HTML attributes.
- An attacker can break out of `src="..."` or CSS attribute contexts and execute script in the admin page.
- Because the payload is persisted in `localStorage`, the XSS can survive reloads until the stored state is cleared.

Recommended secure-by-default fix:

- Stop rendering imported data with `innerHTML`; build these nodes with `createElement`, `textContent`, and safe property assignment.
- Validate `bgImage` as an allowed URL/data URL scheme before use.
- Validate `bgColor` against a strict color format.
- Sanitize or reject imported config fields before writing them to storage.

## Medium Findings

### SEC-005: Both APIs reflect internal error messages to clients

Severity: Medium

Evidence:

- `serverless/media-api/index.mjs:532-533` returns `error.message` in 500 responses.
- `serverless/workspace-api/index.mjs:2952-2954` also returns the thrown message to the client.
- `src/ui/components/sizesAdmin.js:5205` writes `error.message` into `innerHTML`, which can compound rendering issues if upstream errors become attacker-controlled.

Why this matters:

- Internal messages often leak implementation details, bucket/key naming, validation internals, or dependency failures.
- Reflected errors make reconnaissance easier and can create secondary injection risks when the frontend renders them unsafely.

Recommended secure-by-default fix:

- Return a generic client-facing error body for 5xx responses.
- Log detailed diagnostics only on the server side.
- Render frontend error text with `textContent` instead of `innerHTML`.

## Hardening Recommendations

1. Centralize authorization in `workspace-api` and reuse it for media mutations instead of relying on frontend checks or CORS.
2. Add a small security regression suite for:
   - rejected requests without auth to media mutation endpoints,
   - startup failure when placeholder secrets are configured,
   - malicious config imports that attempt HTML/attribute injection.
3. Review all remaining `innerHTML` usage and replace dynamic templating with DOM APIs where untrusted data can flow in.
4. Verify runtime/edge protections that are not visible here:
   - Content Security Policy for the frontend,
   - secure deployment values for cookie flags,
   - origin allowlists at the gateway/CDN layer.

