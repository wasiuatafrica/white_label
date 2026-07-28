# Migration Safety Review

## Migration inventory

| Migration/script | Operation summary | Tables/models affected | Data movement | Risk level | Evidence |
| --- | --- | --- | --- | --- | --- |
| `apps/web/drizzle/0012_majestic_valeria_richards.sql` | Creates Super Admin users, audit logs, FK, and unique email index | `admin_users`, `admin_audit_logs` | None in the migration | low | Migration SQL and Drizzle schema |
| `scripts/copy-neon-db.sh` | Custom-format dump and restore from source Neon DB to empty target | Full public schema | Full schema and data copy | medium | Script and captured successful restore output |
| Heroku config releases v104-v108 | Changes production `DATABASE_URL` and restarts dynos | Entire application data layer | No DB data movement | high | Heroku release history on 2026-07-28 |

## Unsafe migration patterns

### MIG-001: Cutover verification checks only total relation counts
- Severity: high
- Evidence: `copy-neon-db.sh` accepts the copy when source and target public relation totals match. The captured run reported 21 on each side.
- Observed or inferred: Observed.
- Blocking/locking risk: Low for the current small copy; no timing or lock evidence was collected.
- Backward-compatibility risk: A target can have the same relation count while a required object is missing, renamed, or replaced by another object.
- Data-loss risk: The count comparison does not verify row counts or contents.
- Safer alternative: Verify required relation names with `to_regclass`, compare table/column/index/constraint inventories, and compare per-table row counts or controlled checksums before cutover.
- Confidence: high

### MIG-002: Database credentials are hardcoded in a workspace script
- Severity: blocker
- Evidence: `scripts/copy-neon-db.sh` contains complete source and target connection strings.
- Observed or inferred: Observed.
- Blocking/locking risk: None.
- Backward-compatibility risk: Rotating credentials requires updating every legitimate consumer.
- Data-loss risk: Credential disclosure can permit unauthorized database access or mutation.
- Safer alternative: Read `SOURCE_DATABASE_URL` and `TARGET_DATABASE_URL` from uncommitted environment variables, reject missing values, and rotate both exposed credentials.
- Confidence: high

### MIG-003: Copy uses pooler endpoints despite direct-endpoint requirement
- Severity: medium
- Evidence: Both URLs contain `-pooler`; the script and captured run emit warnings recommending direct endpoints.
- Observed or inferred: Observed.
- Blocking/locking risk: Unknown; no failure occurred during the captured restore.
- Backward-compatibility risk: None to application code.
- Data-loss risk: No data loss was observed.
- Safer alternative: Use direct Neon endpoint connection strings for dump/restore and reserve pooled endpoints for application traffic.
- Confidence: high

### MIG-004: Multiple rapid production database config changes obscure incident causality
- Severity: high
- Evidence: Heroku releases v104-v108 all changed `DATABASE_URL` within approximately 16 minutes. The current v108 URL points to the source endpoint.
- Observed or inferred: Observed.
- Blocking/locking risk: None.
- Backward-compatibility risk: Requests during each restart/cutover can reach different database states over time.
- Data-loss risk: Writes made after a rollback to source are not automatically replicated to target.
- Safer alternative: Freeze writes or define a short cutover window, validate the target once, perform one config change, verify, and avoid alternating endpoints.
- Confidence: high

## Deployment ordering risks
- Risk: Deploying application code is unnecessary and adds an unrelated variable to this cutover.
- Evidence: `apps/web/src/db/index.ts` reads `process.env.DATABASE_URL`; Heroku config changes create releases and restart dynos automatically.
- Required order: Complete and validate copy, account for any writes after the copy, set the exact target URL once, wait for the dyno to become `up`, run a fresh login test, then inspect fresh logs.
- Rolling deploy compatibility: One web dyno is currently present, so the config release restarts that dyno. No mixed old/new config fleet was observed.

## Rollback risks
- Risk: Pointing Heroku back to the source makes the application work but creates data divergence if users write to the source after the target copy.
- Evidence: Current Heroku config points to the source endpoint, while the target is a prior copy.
- What breaks on rollback: Any new source-side writes must be recopied or reconciled before a later target cutover.
- Safer rollback/roll-forward plan: Choose a brief maintenance/write-free window, repeat or reconcile the copy if source changed, validate target, cut over once, and keep source read-only as a temporary rollback reference if operationally possible.

## Safer rollout plan
1. Rotate both Neon credentials because they are embedded in the workspace script and appeared in captured terminal material.
2. Change the copy script to consume source and target URLs from environment variables and use direct Neon endpoints.
3. Determine whether the source received writes after the successful copy; if so, recopy into a newly empty target or reconcile changes before cutover.
4. Validate the exact target URL with the application driver. This was successful on 2026-07-28: database `neondb`, role `neondb_owner`, schema `public`, and two readable `admin_users` rows.
5. Compare required schema objects. On 2026-07-28, both endpoints matched on 11 base tables, 166 public columns, and 37 public indexes.
6. Set Heroku `DATABASE_URL` to the exact tested target URL. Do not deploy code for this step.
7. Wait for the config release restart, confirm `web.1` is up, and issue a fresh Super Admin login request.
8. Inspect logs generated after the new release. Do not use the 12:28:32 UTC error as evidence about the newly verified release.

## Pre-release validation checklist
- Schema diff reviewed: Partial — aggregate objects match; add a deterministic object-name/definition diff.
- Explain plans or query review for hot paths: Query reviewed; explain plan not needed for the `42P01` incident.
- Migration dry run on production-like volume: Captured full copy completed successfully; duration/volume was not measured.
- Backfill batching and resume behavior: Not applicable to the full dump/restore flow.
- Lock timeout / statement timeout strategy: Not defined.
- App compatibility before and after migration: Source and target both passed the same application-driver read probe.
- Rollback or roll-forward tested: Endpoint rollback occurred, but divergence handling is not documented.
- Monitoring and alert thresholds: Verify fresh `/api/admin/auth` status and `42P01` absence immediately after cutover.
