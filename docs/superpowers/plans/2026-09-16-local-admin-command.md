# Local Super Admin Command Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `yarn local:admin` command that creates a Super Admin in the local PGlite database.

**Architecture:** Keep the existing Neon-only `create-admin` script unchanged. Add a focused PGlite `.mjs` script with a minimal Drizzle table definition, expose it through the web workspace, and add a root alias for convenient local use.

**Tech Stack:** Node.js 24, Yarn 4 workspaces, PGlite, Drizzle ORM, Argon2.

## Global Constraints

- The local command must target `apps/web/.pglite` directly.
- The command must not read or modify `.env` or production credentials.
- Passwords must be Argon2-hashed and never printed.
- Passwords must be at least 12 characters.
- The existing five-admin limit and duplicate-email protection must be preserved.
- TOTP setup remains in the existing first-login flow.

---

### Task 1: Add the local PGlite admin creator

**Files:**
- Create: `apps/web/scripts/create-local-admin.mjs`

**Interfaces:**
- Consumes positional CLI arguments: `<email> <name> <password>`.
- Produces a row in `admin_users` with `password_hash` populated by Argon2.

- [ ] **Step 1: Add the script**

Create a PGlite client at `apps/web/.pglite`, define the required `admin_users`
columns with Drizzle, validate arguments, check the admin count and email, hash
the password with `argon2.hash`, insert the row, and close the client in a
`finally` block. Print usage for missing or invalid arguments and explain that
the schema must be initialized if the table is missing.

- [ ] **Step 2: Check JavaScript syntax**

Run:

```bash
node --check apps/web/scripts/create-local-admin.mjs
```

Expected: the command exits successfully without output.

### Task 2: Expose the command through package scripts

**Files:**
- Modify: `apps/web/package.json`
- Modify: `package.json`

**Interfaces:**
- Web workspace command: `yarn workspace web create-admin:local <email> <name> <password>`.
- Root command: `yarn local:admin <email> <name> <password>`.

- [ ] **Step 1: Add the workspace script**

Add `"create-admin:local": "node scripts/create-local-admin.mjs"` beside the
existing admin script without changing `"create-admin"`.

- [ ] **Step 2: Add the root alias**

Add `"local:admin": "yarn workspace web create-admin:local"` to the root scripts.

- [ ] **Step 3: Verify argument forwarding**

Run:

```bash
yarn local:admin --help
```

Expected: usage text is printed and no PGlite connection is opened.

### Task 3: Verify the local admin flow

**Files:**
- No additional files.

- [ ] **Step 1: Check the invalid-argument path**

Run:

```bash
yarn local:admin
```

Expected: the command exits non-zero and prints the required usage plus the
12-character password requirement.

- [ ] **Step 2: Create a local admin**

Stop the running Next.js development server first, then run:

```bash
yarn local:admin admin@local.test "Local Super Admin" "Change-this-local-password-123!"
```

Expected: `Local admin created: admin@local.test`.

- [ ] **Step 3: Run the application**

Run:

```bash
yarn workspace web dev:pglite
```

Open `http://localhost:4000/admin`, sign in with the supplied credentials, scan
the displayed TOTP QR code, and enter the six-digit authenticator code.

- [ ] **Step 4: Run static verification**

Run:

```bash
yarn workspace web typecheck
```

Expected: TypeScript completes without errors.
