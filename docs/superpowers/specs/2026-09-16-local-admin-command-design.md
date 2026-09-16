# Local Super Admin Command Design

## Goal

Add a safe local-only command for creating a Super Admin in the repository's
PGlite database without changing the existing Neon admin bootstrap command.

## Design

The root package will expose `yarn local:admin` (or
`npm run local:admin -- ...`) and forward positional arguments to a dedicated
web workspace script:

```bash
yarn local:admin <email> <name> <password>
```

The dedicated script will:

1. Open `apps/web/.pglite` directly.
2. Validate the email, name, and minimum 12-character password.
3. Enforce the existing five-admin limit.
4. Reject an existing email.
5. Hash the password with Argon2.
6. Insert the admin using Drizzle.
7. Close the PGlite client without printing the password.

The existing `create-admin` command remains Neon-only. The local command will
not read or modify `.env`, production credentials, or TOTP settings.

## Login Flow

After creation, the user starts `yarn workspace web dev:pglite`, visits
`http://localhost:4000/admin`, and logs in with the supplied credentials. The
existing first-login flow creates the TOTP secret and displays the QR code.

## Error Handling

The command exits non-zero with a usage message for invalid arguments, a clear
message for duplicate email or the admin limit, and a database guidance message
if the PGlite schema has not been initialized.

## Verification

Verification will include JavaScript syntax checking, the command's invalid
argument path, workspace typechecking, and a manual command invocation against
the local PGlite database when the development server is stopped.
