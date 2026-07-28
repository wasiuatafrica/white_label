# Database Performance Audit

## Executive summary
The observed `42P01 relation "admin_users" does not exist` error is not caused by a missing table in the copied target database and is not a query-performance failure. Read-only checks on 2026-07-28 confirmed that both source and target resolve the unqualified `admin_users` name through `"$user", public`, contain two admin records, and are readable through the same `@neondatabase/serverless` Pool used by the application. The production app currently points back to the source endpoint, so the remaining operational risk is configuring or verifying the exact target URL in Heroku, not rebuilding or redeploying the application.

## Schema and access-layer overview
- DB engine(s): Neon PostgreSQL 18.4 for both inspected endpoints.
- ORM/query builder: Drizzle ORM using `drizzle-orm/neon-serverless`.
- Migration tooling: Drizzle Kit (`db:generate`, `db:migrate`, and `db:push`) plus `scripts/copy-neon-db.sh` for full database copies.
- Connection pooling: `@neondatabase/serverless` `Pool`; both URLs in the copy script currently use Neon pooler endpoints.
- Read/write separation: No separate read URL was found in the inspected application path.
- Queue/outbox tables: Not assessed in this incident-focused review.
- Evidence: `apps/web/src/db/index.ts`, `apps/web/drizzle.config.ts`, root and web `package.json`, and live read-only source/target connection checks.

## Top query risks

### DBQ-001: Unqualified table names depend on the connection search path
- Severity: low
- Category: other
- Evidence: `apps/web/src/db/schema/admin-users.ts` declares `pgTable('admin_users', ...)`, and the generated query uses `"admin_users"` without an explicit schema.
- Observed or inferred: Observed in code. Both inspected connections currently have `search_path = "$user", public`, so this is not the current target failure.
- Why it matters: A future role-level or database-level `search_path` override could reproduce `42P01` even while `public.admin_users` exists.
- Likely symptom: Unqualified queries fail while `public.admin_users` remains visible in Neon.
- Recommended remediation: Keep `public` in the application role's `search_path`, and include `SHOW search_path` plus `to_regclass('admin_users')` in database cutover verification.
- Effort: low
- Confidence: high

### DBQ-002: The login lookup is appropriately bounded and indexed
- Severity: informational
- Category: other
- Evidence: `getAdminUserByEmail` uses an equality predicate and `limit(1)`; `admin_users_email_idx` is a unique index on `email`.
- Observed or inferred: Observed.
- Why it matters: This rules out an inefficient scan as the cause of the reported 500.
- Likely symptom: None for this incident.
- Recommended remediation: No query change required.
- Effort: low
- Confidence: high

## Indexing findings

### IDX-001: Admin email lookup has a matching unique index
- Severity: informational
- Evidence: `apps/web/src/db/schema/admin-users.ts` and `apps/web/drizzle/0012_majestic_valeria_richards.sql`.
- Access pattern affected: Super Admin login by normalized email.
- Recommendation: Retain the unique index.
- Caveats: No production explain plan or latency evidence was collected because the incident is object resolution, not query speed.
- Confidence: high

## Transaction findings

### TX-001: No transaction issue was implicated
- Severity: informational
- Evidence: The failing operation is a single bounded `SELECT`; PostgreSQL returned `42P01` during relation resolution.
- Lock or consistency risk: None observed for this incident.
- Recommended remediation: None.
- Confidence: high

## Connection-pool concerns
- Finding: Both configured copy URLs use `-pooler` hosts even though the script warns that dump and restore should use direct Neon endpoints.
- Evidence: `scripts/copy-neon-db.sh` and its captured output.
- Risk under load: No runtime pool failure was observed. For copy operations, using pooler endpoints adds an unnecessary intermediary and weakens operational clarity.
- Recommendation: Use direct endpoint URLs for `pg_dump` and `pg_restore`; retain a pooler URL for the web application if desired.

## ORM-specific concerns
- Finding: The application initializes Drizzle solely from runtime `process.env.DATABASE_URL`.
- Evidence: `apps/web/src/db/index.ts`.
- Production risk: A wrong Heroku config value routes all Drizzle queries to the wrong endpoint, database, or role while producing SQL errors that can look like migration failures.
- Recommendation: Treat the exact endpoint host, database, role, search path, and required-table resolution as one cutover gate.

## Remediation priorities
1. Set Heroku `DATABASE_URL` to the exact tested target URL; a deployment is not required because a Heroku config change creates a release and restarts the dyno.
2. Immediately verify the new release from a one-off dyno or through the login endpoint, then inspect only fresh logs.
3. Improve `copy-neon-db.sh` verification to compare required relation names and data counts, not only the total public relation count.
4. Remove hardcoded credentials from the script and rotate the exposed source and target database credentials.

## Confidence and unknowns
- Unknown: The exact `DATABASE_URL` value used by release v104 when the 2026-07-28 12:28:32 UTC error occurred.
- Why it matters: Heroku release history shows several database config changes (v104-v108), but current config values do not reconstruct prior secret values. The error log also does not include the endpoint host.
- How to verify safely: Switch once to the exact target string already tested from the script, allow the automatic restart to complete, and correlate a new request with logs generated after that release timestamp.
- Unknown: Whether the screenshot and copy verification were captured before or after the failing request.
- Why it matters: The target is healthy now, but that ordering determines whether the old log was transient or came from a different config value.
- How to verify safely: Compare terminal command timestamps or Heroku release timestamps with the copy completion time.
