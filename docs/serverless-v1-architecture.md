# Banner Generator Target Architecture (Yandex Cloud Managed)

## Product scope (unchanged)

Service purpose: automatic banner generator for internal teams with predictable layout/render, standardized brand rules, and fast export.

UI requirements (unchanged):
- Theme switch: dark/light.
- Locale switch: ru/en.
- 3-column layout:
  - left: settings,
  - center: live preview,
  - right: sizes/export/status/diagnostics.

Product entities and capabilities (unchanged):
- Teams (tenants), directions, size presets.
- Templates/layout configs, assets (logo/KV/background/font), exports (single file or zip).
- Team admin defaults: logos ru/en/kz, fonts, legal variants, age mark, media library, default colors/gradients/background rules, direction size presets.
- Layout rules:
  - vertical/square: logo -> title -> subtitle -> KV -> legal+age.
  - horizontal: split layout text/KV with left-right switching.
  - photo background controls: x/y position, scale, fit mode.
  - explicit fallbacks and diagnostics, no silent reset.
- Export controls:
  - archive name, selected sizes/all, x1/x2, png/jpg, max size KB.
  - one size => single file, multiple sizes => zip.

---

## 1) Architecture (C4-lite, target-first)

### Solution

### Context
- **Actors**: owner/admin/editor/viewer users, internal integrations, SRE/ops.
- **Primary system**: Banner Generator platform on Yandex Cloud managed services.
- **External services**: IdP (OIDC/SAML optional), notifications, analytics.

### Edge & delivery
- **Cloud DNS**: product domains (app/api/cdn).
- **Certificate Manager**: TLS certificates and rotation.
- **CDN**: static SPA, public assets, export downloads acceleration.

### Core containers
1. **Static Web App** in Object Storage static hosting + CDN.
2. **API Gateway** as unified public API surface.
3. **Serverless Containers** (default option):
   - `api-service` (domain API, RBAC, versioning, audit orchestration),
   - `asset-service` (upload intents, validation orchestration),
   - `export-worker` (async render/export processing).
   
   **Alternative option**: Managed Kubernetes for long-running/custom runtime needs.
4. **Managed PostgreSQL**: authoritative domain state, versions, audits, jobs.
5. **Managed Redis**: cache, distributed locks, idempotency keys, ephemeral session state.
6. **Message Queue**: export and asset validation jobs.
7. **Object Storage**:
   - static app bundles,
   - source assets,
   - rendered export artifacts,
   - optional diagnostics bundles.
8. **Lockbox**: secrets storage (DB creds, signing keys, API tokens).
9. **Cloud Logging + Monitoring + Alerting + Audit Trails**.
10. **VPC + Security Groups + IAM Service Accounts** for network and identity isolation.

### Why this
- Production baseline with managed reliability and security controls.
- Separates interactive API latency from heavy async rendering.
- Uses queue + worker model for predictable batch export behavior.
- Preserves modular boundaries so layout/render kernel remains deterministic.

### Risks
- Higher operational complexity vs bucket-only setup.
- Misconfiguration risk across IAM/network/service accounts.
- Queue backlog and worker underprovisioning during peaks.

### Mitigation
- Infra-as-code templates with policy checks.
- Least-privilege IAM roles and segmented service accounts.
- Autoscaling worker policies + queue lag alerts + dead-letter queues.

---

## 2) Data model (PostgreSQL SoT + Object Storage binaries)

### Solution

**Source of truth**: PostgreSQL tables for all domain entities and version metadata.  
**Binary/artifact storage**: Object Storage for uploaded files and export outputs.

### Core entities (authoritative in PostgreSQL)
- `teams`, `users`, `team_memberships` (role owner/admin/editor/viewer).
- `brand_profiles` + profile revisions.
- `directions`, `size_presets`.
- `templates`, `versions` (immutable snapshots), `published_heads`.
- `assets` (metadata + storage keys + validation status + hash).
- `export_jobs`, `export_job_items`, `export_reports`.
- `audit_logs` (append-only).
- `idempotency_keys` (request dedup).

### Storage mapping
- DB stores references:
  - `assets.storage_key`,
  - `export_reports.archive_key` / `file_key`.
- Object Storage prefixes (example):

```text
/static/app/{buildId}/...
/assets/{teamId}/{type}/{assetId}/{originalFilename}
/assets-derivatives/{teamId}/{assetId}/...
/exports/{teamId}/{jobId}/result.zip
/exports/{teamId}/{jobId}/files/{sizeKey}.{png|jpg}
/diagnostics/{teamId}/{date}/{incidentId}.json
```

### Schema/version fields (in DB JSON snapshots)
Each snapshot envelope includes:
- `schema_version`
- `snapshot_checksum_sha256`
- `created_at`, `created_by`
- `lineage` (`parent_version_id`, `rollback_of_version_id` optional)

### Why this
- ACID semantics for domain state and lifecycle transitions.
- Object Storage used where it is strongest: immutable large binaries.
- Clean path to compliance and auditability.

### Risks
- JSON snapshot bloat and hot-table growth.
- Large audit table growth over time.

### Mitigation
- Partition strategy (audit/export tables by time/team).
- Archive policies and retention tiers.
- Index tuning and periodic vacuum/maintenance.

---

## 3) Consistency / concurrency model

### Solution

### Transaction strategy
- Use PostgreSQL transactions for all mutable domain operations:
  - draft save,
  - publish,
  - rollback,
  - asset metadata activation,
  - export job creation/cancellation.

### Concurrency controls
- **Optimistic concurrency**:
  - `version`/`updated_at` check per mutable row (or explicit `lock_version`).
- **Idempotency**:
  - `Idempotency-Key` header persisted in Redis + PostgreSQL table.
- **Distributed locks (Redis)** for critical singleton flows:
  - publish head switch,
  - template-level concurrent mutation windows,
  - export cancellation/settlement races.

### Queue consistency
- Outbox pattern from DB transaction to Message Queue for reliable job emission.
- Worker ack only after DB status update + artifact persistence.

### Why this
- Strong consistency for business-critical transitions.
- Safe retries for client/network failures.
- Race-resistant orchestration for async pipelines.

### Risks
- Deadlocks or lock contention on hot templates.
- Duplicate messages in at-least-once queues.

### Mitigation
- Narrow transaction scopes + predictable lock ordering.
- Idempotent workers keyed by `job_id:item_id`.
- Backoff/retry policy + poison queue handling.

---

## 4) Versioning model (draft / published / rollback)

### Solution

### Lifecycle
- **Draft**: mutable working state linked to template.
- **Publish**:
  1. Validate draft against latest schema and invariants.
  2. Write immutable `versions` snapshot row.
  3. Atomically update `published_heads` pointer in same transaction.
- **Rollback**:
  - never mutate historical version,
  - create new immutable snapshot cloned from chosen historical version,
  - mark `rollback_of_version_id`.

### Immutable contract
- `versions` rows are append-only (no in-place payload changes).
- Renderer/export always execute against explicit `version_id`, never “latest draft”.

### Why this
- Deterministic render reproducibility and incident replay.
- Audit-ready lineage and safe rollback semantics.

### Risks
- Publish contention during frequent edits.
- Schema evolution breaking old drafts.

### Mitigation
- Publish preflight locks + short TTL.
- Migration/normalization pipeline on draft load/save.
- Backward compatibility window for N previous schema versions.

---

## 5) Asset pipeline

### Solution

### Upload flow
1. Client requests upload intent from `asset-service`.
2. Service checks permissions and issues signed URL/policy for Object Storage.
3. Client uploads directly to storage temp prefix.
4. `asset-service` enqueues validation job.
5. Validation worker checks:
   - MIME/content sniff,
   - file size/dimensions/format,
   - optional malware scan/integrity checks,
   - hash extraction for dedup.
6. On success: move/promote to canonical key, update `assets` row status=`validated`.
7. On failure: status=`rejected` with reason; object quarantined or deleted by policy.

### Fallbacks
- Template references stable `asset_id`; replacement failures do not reset existing binding.
- Missing/invalid runtime asset triggers explicit diagnostic fallback (default team asset) + warning event.

### Why this
- Removes backend file proxy bottleneck.
- Keeps validation trustworthy and asynchronous.
- Supports scalable media workloads.

### Risks
- Signed URL misuse if over-permissive.
- Validation queue delays impacting editor flow.

### Mitigation
- Narrow scoped signed policies (key prefix + ttl + mime constraints).
- Priority queue lanes (interactive vs bulk).
- Immediate provisional preview with final publish gate requiring validated assets.

---

## 6) Export pipeline (queue-driven async)

### Solution

### Flow
1. API receives export request (sizes, format, scale, max KB, archive name, version_id).
2. API writes `export_job` + `export_job_items` (queued) in DB transaction.
3. Outbox emits message(s) to queue.
4. `export-worker` consumes items:
   - load immutable version snapshot,
   - run layout engine,
   - render and encode PNG/JPG,
   - enforce `max_size_kb` via compression strategy,
   - upload result files/zip to Object Storage,
   - update per-item status and progress.
5. API exposes polling endpoint + webhook option for completion.

### Behavior
- One size => direct file URL.
- Multiple sizes => zip key + detailed report.
- Partial failures preserved with per-size reason codes.

### Why this
- Isolates heavy compute from request path.
- Supports retries, cancellation, progress, and batch scalability.

### Risks
- Long-tail jobs and queue lag.
- Render environment drift across worker versions.

### Mitigation
- Job timeouts + retry caps + dead-letter routing.
- Worker image pinning and canary rollout.
- Render diagnostics payload stored with each failed item.

---

## 7) Security model (full RBAC)

### Solution

### Identity and access
- Auth via OIDC/SAML (or managed identity provider) through API layer.
- RBAC roles per team:
  - `owner`, `admin`, `editor`, `viewer`.
- Server-side authorization checks for every sensitive action.

### Security controls
- IAM service accounts per workload (`api`, `worker`, `asset-service`) with least privilege.
- VPC isolation and security groups restricting east-west traffic.
- Lockbox for secrets and key rotation.
- Signed URLs for Object Storage writes/reads with short TTL.
- CSP, strict CORS, secure cookies/token storage strategy.

### Audit
- Append-only `audit_logs` with actor, action, resource, before/after diff, correlation id.
- Integrate with Cloud Audit Trails and centralized logging.

### Why this
- Real enforceable role boundaries and traceability.
- Reduced blast radius across services and teams.

### Risks
- Mis-scoped IAM permissions.
- Secret leakage via logs or client bundle.

### Mitigation
- Automated IAM policy linting and periodic access reviews.
- Secret scanning in CI and runtime log redaction.
- Mandatory TLS and strict headers.

---

## 8) Testing strategy (backend + worker aware)

### Solution

### Unit tests
- Domain invariants, RBAC policy matrix, reducers/actions.
- Layout engine rules and explicit fallback reason generation.
- Migration and normalization transforms.

### Integration tests
- API + PostgreSQL transactions (publish/rollback/conflict cases).
- Redis lock/idempotency behavior under retries.
- Queue producer/consumer correctness and outbox processing.
- Asset validation status transitions.

### Contract tests
- API schema tests (OpenAPI), backward compatibility checks.
- Storage key contract tests for artifacts.

### Visual regression
- Golden formats across key sizes (vertical/square/horizontal/ultrawide).

### E2E smoke
- Create template -> upload assets -> publish -> export -> rollback.
- Team role checks across owner/admin/editor/viewer.

### Why this
- Validates determinism, lifecycle correctness, and async reliability.

### Risks
- Flaky async tests due to eventual queue timing.

### Mitigation
- Deterministic test harness with fake clocks/retry controls.
- Separate fast CI suite and nightly long-running reliability suite.

---

## 9) Migration / rollout strategy (target architecture)

### Solution

### Staged launch
1. **Stage 0 (foundation)**: infra provisioning (VPC/IAM/Postgres/Redis/Queue/Storage/API Gateway/CDN/Monitoring).
2. **Stage 1 (internal alpha)**: core editing + publish without public traffic.
3. **Stage 2 (beta teams)**: enable asset async validation + export queue at controlled load.
4. **Stage 3 (GA)**: full RBAC, alerts/SLO gates, rollback runbooks.

### Rollout mechanics
- Blue/green or canary deploy for API and worker images.
- Feature flags for risky capabilities (new layout strategy, compression algorithm).
- Data migrations with expand/contract approach.

### Why this
- Reduces production risk while validating behavior under realistic load.

### Risks
- Schema migration regressions.
- Worker/API version mismatch.

### Mitigation
- Backward-compatible migrations + preflight checks.
- Versioned job payload contracts and compatibility tests.

---

## 10) Environment strategy

### Solution

### Environments
- **dev**: rapid iteration, lower quotas, synthetic data.
- **stage**: production-like topology for release validation.
- **prod**: hardened config, strict IAM, full monitoring/alerts.

Each env has isolated:
- Object Storage buckets,
- PostgreSQL clusters/databases,
- Redis instance,
- queue namespaces,
- service accounts and secrets.

### Promotion policy
- CI -> deploy to dev on merge.
- Stage promotion only via tagged release + automated migration dry-run.
- Prod promotion via manual approval gate and canary health criteria.

### Backup/restore and DR basics
- PostgreSQL automated backups + PITR enabled.
- Object Storage versioning/retention for critical prefixes.
- Restore drills scheduled.

Target baselines:
- **RPO**: <= 15 min for DB, <= 1 hour for non-critical artifacts.
- **RTO**: <= 2 hours for core API and export recovery.

### Why this
- Clean separation of risk domains and predictable release quality.

### Risks
- Config drift between environments.

### Mitigation
- IaC drift detection + policy-as-code checks + periodic env parity audits.

---

## 11) SLO / SLI

### Solution

### Core SLIs and target SLOs
1. **API availability**
   - SLI: successful requests / total (5xx excluded by controlled maintenance windows).
   - SLO: 99.9% monthly.

2. **API latency**
   - SLI: p95 latency for read/write endpoints.
   - SLO: p95 < 300 ms (read), p95 < 500 ms (write) monthly.

3. **Export completion time**
   - SLI: time from job queued to completed for standard batch (e.g., up to 20 sizes).
   - SLO: p95 < 120 sec.

4. **Render success rate**
   - SLI: successful render items / total render items.
   - SLO: >= 99.5% daily (excluding invalid input policy violations).

5. **Queue lag**
   - SLI: oldest message age and consumer lag.
   - SLO: p95 lag < 30 sec during business hours.

### Error budget and alerts
- Monthly error budget tied to each SLO.
- Alerting levels:
  - warning at 50% budget burn pace,
  - critical at 100% projected burn before period end.
- Auto-actions:
  - freeze risky feature rollouts,
  - prioritize reliability fixes until budget recovers.

### Why this
- Makes reliability explicit and governable.

### Risks
- Unrealistic SLOs for early adoption phase.

### Mitigation
- Start with “initial SLOs”, recalibrate after 4-8 weeks of observed traffic.

---

## Transitional v1 (Serverless-only fallback)

### When to apply
- Temporary phase when managed compute/DB/queue are not yet provisioned.
- Internal pilot with low concurrency and trusted users.

### What it is
- Static SPA in Object Storage.
- JSON/JSONL metadata in bucket prefixes.
- Browser-side export and pseudo-transactions via ETag/CAS.

### Limitations
- Weak security/RBAC guarantees (no server-enforced authz).
- No true ACID transactions.
- Higher conflict and data consistency risk under concurrent edits.
- Browser resource limits for heavy batch export.

### How to keep v2 compatibility
- Preserve schema envelopes (`schema_version`, lineage, checksums, actor metadata).
- Keep immutable snapshot concept and explicit published pointer semantics.
- Use stable IDs (team/template/version/asset/export job) matching future DB keys.

### Migration path to target architecture
1. Freeze writes in fallback mode.
2. Import JSON entities into PostgreSQL tables.
3. Attach existing Object Storage binaries by key.
4. Rebuild audit trail table from JSONL.
5. Switch clients to API endpoints while retaining payload schema.

---

## 4-week backlog (target-first launch)

### Week 1 — Platform foundation (managed YC)
- [ ] Provision VPC, security groups, IAM service accounts.
- [ ] Setup Cloud DNS, Certificate Manager, CDN, API Gateway.
- [ ] Provision Managed PostgreSQL, Managed Redis, Message Queue, Object Storage buckets.
- [ ] Setup Lockbox, centralized logging, monitoring dashboards, baseline alerts.
- [ ] Create monorepo modules: `domain`, `layout-engine`, `renderer`, `api-service`, `asset-service`, `export-worker`, `ui`.

### Week 2 — Core domain + API
- [ ] Implement PostgreSQL schema for teams/roles/templates/versions/assets/export jobs/audit.
- [ ] Add runtime schema validation + migration framework for layout configs.
- [ ] Implement RBAC (owner/admin/editor/viewer) and tenant isolation checks.
- [ ] Build template draft/publish/rollback API with immutable snapshots.
- [ ] Integrate Redis idempotency and template-level locking.

### Week 3 — Asset + export async pipelines
- [ ] Implement signed upload URL flow and asset metadata persistence.
- [ ] Implement async asset validation worker and status transitions.
- [ ] Implement queue-driven export worker with progress, retries, cancel.
- [ ] Store export artifacts/reports in Object Storage and expose secure download links.
- [ ] Add diagnostics payloads for layout/render failures.

### Week 4 — Hardening + staged rollout
- [ ] Complete integration/contract/E2E smoke tests for core flows.
- [ ] Add visual regression suite for key format matrix.
- [ ] Define and enforce initial SLOs + error budget policy.
- [ ] Run backup/restore drill and rollback drill.
- [ ] Stage rollout (internal alpha -> beta teams) with canary release strategy.

### Launch readiness criteria
- [ ] Full server-enforced RBAC and tenant isolation operational.
- [ ] Publish/rollback deterministic with immutable version lineage.
- [ ] Async export queue stable with retries/cancel/progress and artifacts.
- [ ] Monitoring + alerts + audit trails active in prod.
- [ ] Transitional fallback documented but not primary path.

---

## Appendix (Execution-ready)

### 1) NFR Matrix (Non-Functional Requirements)

| Category | Requirement | Target | Measurement | Owner | Notes |
|---|---|---:|---|---|---|
| Performance | API read latency (p95) | <= 300 ms monthly | API Gateway + service trace p95 for GET endpoints | Backend | Excludes client/network latency outside YC edge |
| Performance | API write latency (p95) | <= 500 ms monthly | API Gateway + service trace p95 for POST/PATCH | Backend | Includes DB transaction time |
| Performance | Export completion time (p95, <=20 sizes) | <= 120 sec | `export_jobs.completed_at - created_at` | Backend + SRE | Separate SLI for >20 sizes |
| Availability | API availability | >= 99.9% monthly | Successful requests / total requests | SRE | Planned maintenance excluded by calendar |
| Reliability | Render success rate | >= 99.5% daily | Successful render items / total render items | Backend | Invalid user input excluded by policy tags |
| Reliability | Max queue lag (p95) | <= 30 sec business hours | Oldest message age + consumer lag | SRE | Hard alert if > 120 sec for 10 min |
| Security | Critical vulnerability remediation SLA | <= 72 hours | Time from detection to patch in prod | Security | CVSS >= 9.0 only |
| Scalability | Sustained export throughput | >= 50 render items/min/team | Worker completed items/minute | Backend + SRE | Autoscaling floor/ceiling enforced |
| Observability | Correlated request coverage | >= 99% of API/worker logs | Presence of `correlation_id` in logs/traces | SRE | Block release if below 98% in stage |
| Maintainability | Change failure rate | <= 15% monthly | Failed deploys / total deploys | Tech Lead | Per DORA style reporting |
| Data Integrity | Version snapshot immutability violations | 0 per quarter | Integrity audit + checksum mismatch count | Backend | Includes rollback lineage checks |
| Disaster Recovery | Backup cadence (PostgreSQL) | Full daily + WAL/PITR every 5 min | Backup job telemetry | SRE | Restore drill monthly |
| Disaster Recovery | RPO | <= 15 min | Last recoverable point vs incident timestamp | SRE | DB-critical state |
| Disaster Recovery | RTO | <= 2 hours | Time to recover API + export processing | SRE | Measured in quarterly DR test |
| Cost Efficiency | Monthly cloud budget variance | <= +10% vs approved budget | Billing export vs budget baseline | Product + SRE | Breach triggers cost incident review |
| Reliability | Error budget burn rate | <= 100% monthly budget, warning at 50% projected burn | SLO tooling burn-rate alerts | SRE | Freeze risky changes on critical breach |

### 2) Cost Guardrails (Yandex Cloud)

| Service | Cost Driver | Guardrail | Alert Threshold | Action on Breach |
|---|---|---|---|---|
| Managed PostgreSQL | vCPU/RAM tier, storage IOPS/GB, replicas | Max 1 primary + 1 replica in prod baseline, storage growth <= 20%/month | DB monthly cost > 120% forecast OR CPU > 80% for 30 min | Scale only with approval, tune queries/indexes, archive old audit partitions, escalation to Tech Lead + Product |
| Managed Redis | Instance class, memory footprint, network ops | Memory utilization target <= 70%, maxmemory + eviction policy configured | Memory > 80% for 15 min | Reduce cache TTL, drop non-critical keys, cap idempotency TTL, scale tier only after review |
| Message Queue | Message volume, retention, DLQ growth | Queue retention <= 72h (main), DLQ <= 7d, max in-flight cap per consumer | Oldest message > 120 sec or queue cost > 130% forecast | Throttle non-critical exports, worker cap adjustment, temporary feature gating for bulk exports |
| Serverless Containers / workers | CPU/memory seconds, invocation count, concurrency | Per-service concurrency caps; export worker max concurrency = 40 | Compute spend > 125% forecast or throttling events > 1% | Lower worker cap for low-priority queues, optimize render pipeline, disable x2 export for non-admin temporarily |
| Object Storage | Stored GB-month, PUT/GET operations, egress | Lifecycle: tmp=24h, diagnostics=30d, exports=14d default, unused assets=90d | Storage growth > 25% month-over-month | Tighten retention, deduplicate assets, stop storing local-download duplicate exports |
| CDN | Egress traffic, cache miss ratio | Cache hit ratio >= 85% for static assets | Hit ratio < 75% for 24h or egress > 130% forecast | Tune cache keys/TTL, purge only scoped paths, enable compression and asset fingerprinting |
| Logging/Monitoring | Log ingestion/retention, metric cardinality | Structured logs only; default retention 14d app logs, 30d security/audit index | Log ingestion > 140% forecast or cardinality alert triggered | Sampling increase for debug logs, cut noisy fields, retention tuning, incident review with SRE |

**Standard escalation policy for repeated cost breaches (>=2 consecutive days):**
1. Immediate throttling of non-critical workloads.
2. Temporary feature gating (bulk export, high-resolution export, verbose diagnostics).
3. Cost review meeting (Product + Tech Lead + SRE) within 24 hours.
4. Formal escalation to engineering management if projected monthly overrun > 20%.

### 3) OpenAPI First Draft (minimum viable contracts)

#### Common error envelope

```json
{
  "code": "EXPORT_RENDER_FAILED",
  "message": "Human-readable message",
  "details": {},
  "correlation_id": "uuid"
}
```

#### Common error codes
- `AUTH_UNAUTHORIZED`, `AUTH_TOKEN_EXPIRED`, `AUTH_FORBIDDEN`
- `TENANT_ACCESS_DENIED`, `ROLE_INSUFFICIENT`
- `VALIDATION_ERROR`, `CONFLICT_DETECTED`, `IDEMPOTENCY_CONFLICT`
- `ASSET_INVALID_TYPE`, `ASSET_VALIDATION_PENDING`, `ASSET_UPLOAD_FAILED`
- `VERSION_PUBLISH_BLOCKED`, `VERSION_NOT_FOUND`
- `EXPORT_NOT_FOUND`, `EXPORT_ALREADY_CANCELLED`, `EXPORT_RENDER_FAILED`
- `RATE_LIMITED`, `INTERNAL_ERROR`

#### Auth

**POST /auth/login**
- Purpose: user authentication and token issuance.
- Required role: n/a (public).
- Request: `{ "email": "", "password": "", "team_id": "optional" }`
- Response: `{ "access_token": "jwt", "refresh_token": "jwt", "expires_in": 3600, "user": { "id": "", "roles": ["viewer"] } }`
- Common errors: `AUTH_UNAUTHORIZED`, `VALIDATION_ERROR`, `RATE_LIMITED`.

**POST /auth/refresh**
- Purpose: rotate access token.
- Required role: authenticated.
- Request: `{ "refresh_token": "" }`
- Response: `{ "access_token": "jwt", "expires_in": 3600 }`
- Common errors: `AUTH_TOKEN_EXPIRED`, `AUTH_UNAUTHORIZED`.

**POST /auth/logout**
- Purpose: revoke refresh token/session.
- Required role: authenticated.
- Request: `{ "refresh_token": "" }`
- Response: `{ "ok": true }`
- Common errors: `AUTH_UNAUTHORIZED`.

#### Templates / Versions

**GET /templates**
- Purpose: list team templates.
- Required role: `viewer+`.
- Request: query `direction_id`, `status`, `page`, `page_size`.
- Response: `{ "items": [{ "id": "", "name": "", "published_version_id": "", "updated_at": "" }], "next_cursor": "" }`
- Common errors: `TENANT_ACCESS_DENIED`, `AUTH_FORBIDDEN`.

**POST /templates**
- Purpose: create template with initial draft.
- Required role: `editor+`.
- Request: `{ "name": "", "direction_id": "", "layout_config": {}, "idempotency_key": "" }`
- Response: `{ "id": "", "draft_version_id": "", "created_at": "" }`
- Common errors: `VALIDATION_ERROR`, `IDEMPOTENCY_CONFLICT`, `TENANT_ACCESS_DENIED`.

**PATCH /templates/{id}**
- Purpose: update draft metadata/config.
- Required role: `editor+`.
- Request: `{ "name": "optional", "layout_config": {}, "lock_version": 12 }`
- Response: `{ "id": "", "draft_version_id": "", "lock_version": 13, "updated_at": "" }`
- Common errors: `CONFLICT_DETECTED`, `VALIDATION_ERROR`, `VERSION_NOT_FOUND`.

**POST /templates/{id}/publish**
- Purpose: publish current draft as immutable version.
- Required role: `admin+`.
- Request: `{ "draft_version_id": "", "change_note": "", "idempotency_key": "" }`
- Response: `{ "template_id": "", "published_version_id": "", "published_at": "" }`
- Common errors: `VERSION_PUBLISH_BLOCKED`, `CONFLICT_DETECTED`, `ASSET_VALIDATION_PENDING`.

**POST /templates/{id}/rollback**
- Purpose: rollback by creating new version from historical snapshot.
- Required role: `admin+`.
- Request: `{ "target_version_id": "", "reason": "", "idempotency_key": "" }`
- Response: `{ "template_id": "", "new_version_id": "", "rollback_of_version_id": "" }`
- Common errors: `VERSION_NOT_FOUND`, `CONFLICT_DETECTED`, `AUTH_FORBIDDEN`.

#### Assets

**POST /assets/upload-intent**
- Purpose: issue signed upload parameters.
- Required role: `editor+`.
- Request: `{ "type": "logo|kv|background|font", "filename": "", "content_type": "", "size_bytes": 0, "checksum_sha256": "" }`
- Response: `{ "asset_id": "", "upload": { "url": "", "method": "PUT", "headers": {} }, "expires_at": "" }`
- Common errors: `ASSET_INVALID_TYPE`, `VALIDATION_ERROR`, `AUTH_FORBIDDEN`.

**POST /assets/{id}/complete**
- Purpose: confirm upload and enqueue validation.
- Required role: `editor+`.
- Request: `{ "storage_key": "", "etag": "", "size_bytes": 0 }`
- Response: `{ "asset_id": "", "status": "pending_validation", "validation_job_id": "" }`
- Common errors: `ASSET_UPLOAD_FAILED`, `VALIDATION_ERROR`, `CONFLICT_DETECTED`.

**GET /assets**
- Purpose: list assets with validation state.
- Required role: `viewer+`.
- Request: query `type`, `status`, `cursor`, `page_size`.
- Response: `{ "items": [{ "id": "", "type": "", "status": "validated", "preview_url": "" }], "next_cursor": "" }`
- Common errors: `TENANT_ACCESS_DENIED`, `AUTH_FORBIDDEN`.

#### Exports

**POST /exports**
- Purpose: create async export job.
- Required role: `editor+`.
- Request: `{ "template_id": "", "version_id": "", "sizes": [{ "w": 1080, "h": 1080 }], "format": "png|jpg", "scale": "x1|x2", "max_size_kb": 300, "archive_name": "", "idempotency_key": "" }`
- Response: `{ "job_id": "", "status": "queued", "created_at": "" }`
- Common errors: `VALIDATION_ERROR`, `ASSET_VALIDATION_PENDING`, `IDEMPOTENCY_CONFLICT`.

**GET /exports/{id}**
- Purpose: get export status/progress/report.
- Required role: `viewer+`.
- Request: path `id`.
- Response: `{ "job_id": "", "status": "running", "progress": 42, "items": [{ "size": "1080x1080", "status": "ok" }], "report_url": "" }`
- Common errors: `EXPORT_NOT_FOUND`, `TENANT_ACCESS_DENIED`.

**POST /exports/{id}/cancel**
- Purpose: cancel running/queued export.
- Required role: `editor+`.
- Request: `{ "reason": "optional" }`
- Response: `{ "job_id": "", "status": "cancelled" }`
- Common errors: `EXPORT_NOT_FOUND`, `EXPORT_ALREADY_CANCELLED`, `CONFLICT_DETECTED`.

**GET /exports/{id}/download**
- Purpose: issue signed download link for completed artifact.
- Required role: `viewer+`.
- Request: path `id`.
- Response: `{ "job_id": "", "status": "completed", "download_url": "", "expires_at": "" }`
- Common errors: `EXPORT_NOT_FOUND`, `CONFLICT_DETECTED`.

#### Audit

**GET /audit**
- Purpose: query audit log stream by resource and period.
- Required role: `admin+` (read-only `viewer` denied by default policy).
- Request: query `from`, `to`, `actor_id`, `resource_type`, `resource_id`, `cursor`.
- Response: `{ "items": [{ "id": "", "action": "template.publish", "actor": "", "created_at": "", "correlation_id": "" }], "next_cursor": "" }`
- Common errors: `AUTH_FORBIDDEN`, `TENANT_ACCESS_DENIED`, `VALIDATION_ERROR`.

### 4) Operational Runbooks

#### A. Queue lag high
- Trigger condition:
  - Queue lag p95 > 30 sec for 10 min OR oldest message age > 120 sec.
- First 10 minutes triage:
  1. Check worker health/restarts and current concurrency.
  2. Verify queue depth by priority lane.
  3. Identify top tenant/job type causing burst.
- Mitigation steps:
  1. Increase worker replicas/concurrency within cap.
  2. Throttle low-priority/bulk exports.
  3. Re-route poison messages to DLQ.
- Escalation path:
  - On-call SRE -> Backend Tech Lead -> Product (if feature gating needed).
- Post-incident checklist:
  - Document root cause, update autoscaling policy, add regression alert.

#### B. Worker crash loop
- Trigger condition:
  - Worker restart count > 5 in 10 min or no successful jobs for 10 min.
- First 10 minutes triage:
  1. Inspect latest crash logs with correlation ids.
  2. Validate recent deployment/version diff.
  3. Check dependency health (DB/Redis/Storage).
- Mitigation steps:
  1. Roll back to previous stable image.
  2. Pause queue consumption if crash persists.
  3. Re-enable gradually via canary consumer.
- Escalation path:
  - On-call Backend -> SRE -> Security (if suspicious payload pattern).
- Post-incident checklist:
  - Add test for failing payload, update runbook with signature, create RCA.

#### C. Publish conflict spike
- Trigger condition:
  - `CONFLICT_DETECTED` on publish > 5% over 15 min.
- First 10 minutes triage:
  1. Confirm lock service health (Redis).
  2. Check hot templates edited concurrently.
  3. Verify lock TTL / stale lock cleanup metrics.
- Mitigation steps:
  1. Increase lock TTL slightly and enforce lock refresh.
  2. Add temporary publish rate limit per template.
  3. Prompt users with explicit conflict resolution workflow.
- Escalation path:
  - Backend lead -> Frontend lead (UX conflict flow) -> Product.
- Post-incident checklist:
  - Review optimistic lock strategy and tune retry/backoff defaults.

#### D. Storage upload/sign URL failures
- Trigger condition:
  - Upload intent failure rate > 2% for 10 min OR storage 4xx/5xx spike.
- First 10 minutes triage:
  1. Check API Gateway/service error split.
  2. Validate signed URL expiry skew and key policy constraints.
  3. Verify Object Storage regional/service status.
- Mitigation steps:
  1. Extend signed URL TTL from 10 to 20 min temporarily.
  2. Retry intent issuance with idempotency key.
  3. Fallback to alternative upload prefix policy.
- Escalation path:
  - Backend on-call -> SRE -> YC support ticket (if provider incident).
- Post-incident checklist:
  - Rotate signing keys if misuse suspected; update policy tests.

#### E. DB connection saturation
- Trigger condition:
  - Active DB connections > 85% pool for 5 min OR connection timeout rate > 1%.
- First 10 minutes triage:
  1. Identify top queries and lock waits.
  2. Check pool config drift in latest deployment.
  3. Confirm background job bursts.
- Mitigation steps:
  1. Enable strict connection pool limits + queueing.
  2. Temporarily throttle write-heavy endpoints.
  3. Kill long-running non-critical queries and tune indexes.
- Escalation path:
  - Backend DBA owner -> SRE -> Tech Lead.
- Post-incident checklist:
  - Add slow-query alert and migration/index action items.

#### F. Export failure rate spike
- Trigger condition:
  - Render/export item failures > 1% for 15 min or >0.5% for top tenant.
- First 10 minutes triage:
  1. Segment failures by error code and format/size.
  2. Verify renderer version rollout and recent config migrations.
  3. Inspect asset validation status linkage.
- Mitigation steps:
  1. Roll back renderer image if regression confirmed.
  2. Disable problematic format/scale path via feature flag.
  3. Replay failed jobs with fixed worker version.
- Escalation path:
  - Backend on-call -> Tech Lead -> Product (customer comms if needed).
- Post-incident checklist:
  - Add golden visual case for failed scenario and update alert thresholds.

### 5) Ownership Matrix (RACI)

| Area | Product | Tech Lead | Backend | Frontend | DevOps/SRE | Security | QA |
|---|---|---|---|---|---|---|---|
| API/domain services | C | A | R | I | C | C | C |
| Layout engine | C | A | R | R | I | I | C |
| Renderer/export worker | I | A | R | C | C | I | C |
| DB schema & migrations | I | A | R | I | C | I | C |
| Infra/IAM/network | I | C | C | I | A/R | C | I |
| Monitoring/SLO | I | A | C | I | R | C | C |
| Security/secrets | I | C | C | I | C | A/R | I |
| Incident response | I | A | R | C | R | C | I |
| Release management | C | A | R | R | C | C | C |

Legend: **R** = Responsible, **A** = Accountable, **C** = Consulted, **I** = Informed.

### 6) Go-live checklist (10 items)

1. [ ] Production DNS/TLS/CDN routing validated end-to-end (app + API + download domains).
2. [ ] RBAC policy tests pass for owner/admin/editor/viewer across all protected endpoints.
3. [ ] Publish/rollback flow verified with immutable version lineage and audit entries.
4. [ ] Export queue path validated under load (>= target throughput) with retry/cancel behavior.
5. [ ] Asset signed upload + async validation + quarantine flow verified.
6. [ ] SLO dashboards and alert policies active (latency, availability, queue lag, render success, error budget).
7. [ ] Backup/PITR restore drill completed successfully within RTO target.
8. [ ] Cost guardrail alerts configured and tested for all listed managed services.
9. [ ] Incident runbooks linked in on-call channel and acknowledged by owners.
10. [ ] Stage-to-prod canary rollout and rollback procedure executed successfully at least once.
