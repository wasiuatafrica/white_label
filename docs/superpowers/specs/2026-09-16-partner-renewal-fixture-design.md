# Local Partner License Renewal Fixture Design

## Goal

Add a safe local command for creating a repeatable test partner whose previous
30-day license period ended 30 days ago. The fixture must be ready for the
partner-license cron to issue the next renewal invoice.

## Scope

The command targets only `apps/web/.pglite`; it never reads or writes
`DATABASE_URL`, `.env`, Neon, or production data. Partner identity values are
placeholder constants in the script for now so they can be replaced directly
before testing.

The command is intentionally one-shot for the configured placeholder slug. If
that slug already exists, it fails with a clear error instead of modifying or
deleting existing local data.

## Command interface

Expose both commands:

```bash
yarn local:partner-renewal
yarn workspace web create-partner-renewal:local
```

The command takes no arguments. Its output identifies the created partner,
previous invoice, expired period, and admin PIN used for local partner-admin
login. The PIN is a test-only placeholder and the database stores only its
Argon2id hash.

## Fixture data

The script inserts one `partners` row with:

- `status: active`, allowing the renewal cron to select it;
- placeholder slug, firm name, owner name, and owner email;
- a valid hashed six-digit admin PIN;
- normal defaults for branding, markup, trader counters, and revenue;
- `monthly_fee_paid: false`, because the latest license is no longer current.

It then inserts one `partner_license_invoices` row:

- `status: paid`;
- `amount` and `verified_amount` equal to the configured partner license fee;
- `period_start` 60 days before execution;
- `period_end` and `due_at` 30 days before execution;
- `paid_at` equal to the expired period start;
- system verification metadata;
- no receipt or overdue-notice fields.

The resulting latest invoice satisfies
`now >= latest.periodEnd`, so `findPartnersNeedingRenewalInvoice` returns the
partner. The cron remains responsible for creating the next `pending` invoice
and sending its renewal email.

## Implementation

Create a focused `.mjs` script using `PGlite`, Drizzle ORM, and minimal table
definitions for `partners` and `partner_license_invoices`. It will:

1. Open the fixed local PGlite directory.
2. Validate that the schema exists.
3. Check for the configured placeholder slug and fail if found.
4. Insert the partner and expired paid invoice in a transaction.
5. Close PGlite in a `finally` block.

The root `package.json` and web workspace `package.json` receive script aliases.
No production query or API behavior changes are required.

## Error handling

The command exits non-zero for an existing slug, missing PGlite schema,
database constraint failures, or any unexpected insert error. It must not print
the hashed PIN or any database credentials. If the local app is holding the
PGlite database open, the error should be reported without destructive retry
behavior.

## Verification

Verification will cover:

1. JavaScript syntax checking.
2. Root command forwarding.
3. A missing-schema/error path where applicable.
4. A real successful invocation against local PGlite after confirming the
   database is not held by a running development server.
5. Queries confirming the partner is active, the invoice is paid, its period
   ended 30 days before creation, and the cron renewal query returns it.
6. Workspace typechecking and relevant existing tests.
