# Local Partner License Renewal Fixture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a PGlite-only command that creates an active placeholder partner with a paid license period that ended 30 days ago, allowing the partner-license cron to exercise renewal behavior.

**Architecture:** Use a standalone Node ESM script with PGlite and Drizzle table definitions limited to the partner and license-invoice columns used by the fixture. The script opens `apps/web/.pglite`, inserts both rows in one Drizzle transaction, refuses an existing placeholder slug, and closes PGlite in `finally`. Root and web workspace scripts expose the command.

**Tech Stack:** Node.js 24, Yarn 4, PGlite, Drizzle ORM, Argon2, Vitest.

## Global Constraints

- The command targets only `apps/web/.pglite`.
- The command must not read or modify `.env`, `DATABASE_URL`, Neon, or production credentials.
- Partner identity values remain placeholder constants in the script.
- The command must fail if the configured placeholder slug already exists.
- The previous license must be `paid`, with `periodStart` 60 days ago and `periodEnd`/`dueAt` 30 days ago.
- The partner must be `active` with `monthlyFeePaid: false`.
- The partner admin PIN must be stored as an Argon2id hash.
- Database writes must use Drizzle ORM.
- Do not edit the approved design document or existing plan files.

---

### Task 1: Specify the fixture date contract with a failing test

**Files:**
- Create: `apps/web/scripts/create-partner-renewal.test.mjs`
- Create later: `apps/web/scripts/create-partner-renewal.mjs`

**Interfaces:**
- Test imports `buildFixtureDates` from `./create-partner-renewal.mjs`.
- `buildFixtureDates(now)` returns `{ periodStart, periodEnd, dueAt }`, each a `Date`.

- [ ] **Step 1: Write the failing test**

Create a test that verifies the exact relative dates used by the fixture:

```js
import { describe, expect, it } from 'vitest';
import { buildFixtureDates } from './create-partner-renewal.mjs';

describe('buildFixtureDates', () => {
  it('creates a paid period ending 30 days before the fixture timestamp', () => {
    const now = new Date('2026-09-16T12:00:00.000Z');
    const dates = buildFixtureDates(now);

    expect(dates.periodStart.toISOString()).toBe('2026-07-18T12:00:00.000Z');
    expect(dates.periodEnd.toISOString()).toBe('2026-08-17T12:00:00.000Z');
    expect(dates.dueAt.toISOString()).toBe('2026-07-18T12:00:00.000Z');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
yarn workspace web vitest run scripts/create-partner-renewal.test.mjs
```

Expected: FAIL because `scripts/create-partner-renewal.mjs` and
`buildFixtureDates` do not exist yet.

### Task 2: Implement the local renewal fixture script

**Files:**
- Create: `apps/web/scripts/create-partner-renewal.mjs`

**Interfaces:**
- `buildFixtureDates(now: Date): { periodStart: Date; periodEnd: Date; dueAt: Date }`
- CLI: `yarn workspace web create-partner-renewal:local`
- CLI output includes the created slug, expired invoice number, period range, and
  test PIN.

- [ ] **Step 1: Add constants and minimal Drizzle tables**

Add all imports at the top of the ESM module:

```js
import argon2 from 'argon2';
import { PGlite } from '@electric-sql/pglite';
import { count, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { pgTable, serial, integer, numeric, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
```

Define placeholder constants, the fixed PGlite directory, the 24-hour day
constant, and minimal `partners`/`partner_license_invoices` tables matching the
database column names. Use `PARTNER_LICENSE_FEE = 95000` and
`PARTNER_LICENSE_PERIOD_DAYS = 30` to match the application billing constants.

- [ ] **Step 2: Implement the date and invoice-number helpers**

Implement:

```js
export function addDays(date, days) {
  return new Date(date.getTime() + days * DAY_IN_MS);
}

export function buildFixtureDates(now) {
  const periodStart = addDays(now, -60);
  const periodEnd = addDays(now, -30);
  return { periodStart, periodEnd, dueAt: periodStart };
}
```

Also format `periodStart` as UTC `YYYYMMDD` and generate
`INV-${PLACEHOLDER_SLUG.toUpperCase()}-${YYYYMMDD}`.

- [ ] **Step 3: Implement the transactional insert**

Open `new PGlite(PGLITE_DIR)` and create `drizzle(client)`. Validate the local
schema by selecting one partner row before attempting the insert. Within
`db.transaction(async (tx) => { ... })`:

1. Select the configured slug with `eq(partners.slug, PLACEHOLDER_SLUG)` and
   throw `A local partner already exists for <slug>.` if found.
2. Insert the active partner with explicit placeholder identity, hashed
   `TEST_ADMIN_PIN`, zero markup/revenue, false monthly coverage, and current
   timestamps.
3. Insert the paid invoice using the dates from `buildFixtureDates(now)`,
   `amount: '95000'`, `verifiedAmount: '95000'`, `verifiedBy:
   'system/test-fixture'`, and a clear verification note.
4. Return both inserted rows for the success message.

Hash the PIN with `argon2.hash(TEST_ADMIN_PIN, { type: argon2.argon2id })`;
never store or print the hash.

- [ ] **Step 4: Add CLI error handling and resource cleanup**

Support `--help` and `-h` without opening PGlite. For normal execution, call the
transaction function and print only safe fixture details. Catch errors,
translate missing-table errors into:

```text
The local PGlite schema is not initialized. Start the app once with `yarn workspace web dev:pglite` or run `yarn db:push:pglite` first.
```

Set `process.exitCode = 1` on failure and close the PGlite client in `finally`.
Guard the CLI entry point so importing the module from Vitest does not execute
the command.

- [ ] **Step 5: Run the focused tests**

Run:

```bash
yarn workspace web vitest run scripts/create-partner-renewal.test.mjs
```

Expected: PASS.

### Task 3: Expose root and workspace commands

**Files:**
- Modify: `apps/web/package.json`
- Modify: `package.json`

**Interfaces:**
- Web command: `yarn workspace web create-partner-renewal:local`
- Root command: `yarn local:partner-renewal`

- [ ] **Step 1: Add the web workspace script**

Add beside the existing admin scripts:

```json
"create-partner-renewal:local": "node scripts/create-partner-renewal.mjs"
```

- [ ] **Step 2: Add the root alias**

Add beside `local:admin`:

```json
"local:partner-renewal": "yarn workspace web create-partner-renewal:local"
```

- [ ] **Step 3: Verify help forwarding**

Run:

```bash
yarn local:partner-renewal --help
```

Expected: usage and the placeholder fixture details are printed, with no
database connection attempt.

### Task 4: Verify the real local renewal fixture

**Files:**
- No additional files.

- [ ] **Step 1: Check JavaScript syntax**

Run:

```bash
node --check apps/web/scripts/create-partner-renewal.mjs
```

Expected: exit code 0 and no output.

- [ ] **Step 2: Create the fixture**

Stop any running process using the local PGlite database, then run:

```bash
yarn local:partner-renewal
```

Expected: a success message containing the placeholder slug, an invoice
number, a period ending 30 days before execution, and the six-digit test PIN.

- [ ] **Step 3: Verify duplicate protection**

Run the same command again:

```bash
yarn local:partner-renewal
```

Expected: non-zero exit with the existing-slug error and no second partner or
invoice inserted.

- [ ] **Step 4: Run the partner license cron**

With the PGlite development server running, call the local cron route:

```bash
curl -X POST http://localhost:4000/api/cron/partner-licenses
```

Expected: the JSON summary reports one renewal issued. Because the renewal
invoice is already 30 days past due, the same run may also report one overdue
notice according to the existing cron behavior.

- [ ] **Step 5: Run project verification**

Run:

```bash
yarn workspace web typecheck
yarn workspace web test
```

Expected: both commands complete successfully.

The workspace is not a git repository, so no commit step is included.
