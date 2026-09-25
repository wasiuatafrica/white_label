# Security Audit

## 1. Vulnerability Summary

| Severity | Count |
| --- | ---: |
| Critical | 1 |
| High | 6 |
| Medium | 10 |
| Low | 3 |

### Scoped out / not applicable

Checked, not omitted:

- GraphQL
- App-level WebSockets
- XXE / `pickle` / `YAML.load`
- `JWT alg:none` (sessions are HMAC blobs, not JWTs)
- SQL string-concatenation injection (Drizzle bound parameters)
- Kubernetes/Terraform
- A production mobile auth surface (`apps/mobile` is a scaffold and Better Auth is disabled)

### Assumption

The S3 bucket is private, as the code and workspace documentation describe. Bucket ACLs are not in this repository.

## 2. Detailed Findings

### C-1 — Neon connection strings committed in the DB clone script

**Severity:** Critical  
**Confidence:** Confirmed  
**Affected:** `scripts/copy-neon-db.sh` lines 21–22

**Description:** `SOURCE_DATABASE_URL` and `TARGET_DATABASE_URL` contain plaintext `postgresql://neondb_owner:…@*.aws.neon.tech/neondb` URLs. Workspace guidance says not to commit real credentials; this file does. The passwords are not repeated here.

**Exploitation:** Anyone with repository, backup, or chat access can try those URLs and dump KYC, payout bank details, TOTP secrets, plaintext MT5 passwords, and session-relevant hashes.

**Impact:** Full confidentiality loss for both databases if the roles are still valid.

**Fix:**

- Rotate both Neon roles immediately.
- Move URLs to environment variables or a secrets manager.
- Purge the strings from git history and any clones.
- Add secret scanning to CI.

### H-1 — Global unique trader email plus unauthenticated checkout enables cross-tenant lockout

**Severity:** High  
**Confidence:** Confirmed  
**Affected:** `apps/web/src/db/schema/traders.ts` line 39 (`uniqueIndex('traders_email_idx')`); `apps/web/src/app/api/partners/[slug]/evaluations/route.ts` `POST` (lines 120–187, no rate limit); `apps/web/src/app/api/partners/[slug]/auth/register/route.ts`

**Description:** Trader emails are unique across the whole platform. Guest checkout creates a trader with only name, email, and a client-supplied `payment_proof_url`. Registration is also unauthenticated (storefront-open check only).

**Exploitation:** An attacker can `POST /api/partners/{slug}/evaluations` with a victim’s email and any proof URL. The victim then receives `409 This email is already registered with another firm` on every other partner. Setup mail goes to the victim, so this is identity denial of service, not inbox takeover.

**Impact:** Permanent signup denial for targeted emails and unlimited fake pending evaluations because this `POST` has no limiter.

**Fix:**

- Rate-limit and CAPTCHA guest checkout.
- Consider making email unique per partner rather than globally.
- Require a verified session or signed intent before inserting a trader.

### H-2 — Unauthenticated upload intents write into the private S3 bucket

**Severity:** High  
**Confidence:** Confirmed  
**Affected:** `apps/web/src/app/api/upload-intent/route.ts`; `apps/web/src/lib/upload-auth.ts` lines 40–62; `apps/web/src/app/api/upload/route.ts`

**Description:** `POST /api/upload-intent` is public. `partner_apply` only needs an `attempt_id` string. `guest_checkout` only needs a valid slug. `authorizeUpload` then allows a 10 MB JPEG/PNG/WebP/GIF/PDF upload into `uploads/receipts/...`.

**Exploitation:** An attacker can mint an intent, upload malware or a fake receipt, and submit it through `/api/partners` or guest evaluation. Super Admin is then asked to open a “receipt.”

**Impact:** Storage abuse, malware hosting on FT9ja’s bucket, and fake payment proofs in the admin queue.

**Fix:**

- Bind intents to Turnstile or OTP verification.
- Use a short TTL and one-shot `jti`.
- Add Redis rate limits.
- Reject uploads whose purpose does not match a real in-flight signup or checkout row.

### H-3 — Super Admin impersonation tokens in URLs are replayable for one hour

**Severity:** High  
**Confidence:** Confirmed  
**Affected:** `apps/web/src/lib/admin-trader-view-token.ts`; `apps/web/src/lib/admin-partner-admin-view-token.ts`; `apps/web/src/app/api/partners/[slug]/admin-view/route.ts`; evaluations `GET` `view_token` handling (lines 97–110)

**Description:** Tokens are HMAC-authenticated but have no `jti`, are not consumed, and are placed in query strings. `admin-view` `GET` sets a read-only partner-admin cookie. Evaluations `GET` with `view_token` returns `mapTraderPublic`, which still includes `kyc_id_number`, `kyc_address`, `kyc_id_url`, and `kyc_selfie_url`.

**Exploitation:** A token copied from browser history, logs, or a shared screen can be replayed for up to 3,600 seconds without a Super Admin session.

**Impact:** Cross-tenant KYC disclosure and read-only partner-admin access that includes `account_creation_code` from `listEvaluationsByPartnerId`.

**Fix:**

- Use one-time tokens.
- Bind tokens to the admin user ID.
- Deliver the token via `POST` or `Location` without placing it in a query string.
- Prefer minting the cookie server-side and redirecting without a token.
- Strip KYC data from view-token responses.

### H-4 — Public partner API leaks owner PII and payment-proof URLs

**Severity:** High  
**Confidence:** Confirmed  
**Affected:** `GET /api/partners/[slug]` in `apps/web/src/app/api/partners/[slug]/route.ts` lines 69–80; `mapPartnerPublic` in `apps/web/src/db/mappers.ts` lines 39–43 (only `admin_pin` is stripped)

**Description:** Unauthenticated `GET` returns `owner_name`, `owner_email`, `payment_proof_url`, `fee_markup`, `total_revenue`, and license-introduction fields.

**Exploitation:** An attacker can enumerate slugs, or use `check-slug`, to retrieve owner email addresses and receipt object URLs for phishing or targeting.

**Impact:** PII exposure; receipt keys aid H-2 social engineering even if the bucket is private.

**Fix:** Define a public DTO containing only `firm_name`, branding, template, and `storefront_frozen`. Keep owner, payment, and revenue fields on authenticated admin routes.

### H-5 — Partner PIN change revokes every session on the platform

**Severity:** High  
**Confidence:** Confirmed  
**Affected:** `revokeAllStatefulSessions()` in `apps/web/src/lib/session-revocation.ts`; called from `reset-pin/route.ts` line 60 and partner `PATCH` when `admin_pin` changes (`partners/[slug]/route.ts` line 146). Cache TTL: 60 seconds (`CACHE_TTL_MS`).

**Description:** One timestamp in `app_settings` invalidates all trader, partner-admin, and Super Admin HMAC cookies. Other dynos can accept revoked cookies for up to 60 seconds.

**Exploitation:** A compromised or abusive partner admin can reset the PIN to cause a platform-wide logout. Combined with OTP guessing (M-3), this becomes both a takeover of one tenant and an availability attack against everyone else.

**Impact:** Cross-tenant availability impact and delayed revocation on other dynos.

**Fix:**

- Revoke per `partnerId` or `adminUserId` using a version column or denylist.
- Do not share one global `iat` watermark.

### H-6 — Rate limits are in-memory and trust `X-Forwarded-For[0]`

**Severity:** High  
**Confidence:** Likely (in-memory behavior confirmed; header trust is environment-dependent)  
**Affected:** `apps/web/src/lib/rate-limit.ts`

**Description:** Limits live in a process `Map`. Heroku multi-dyno deployments reset them. `getRequestRateLimitKey` uses the first `X-Forwarded-For` hop, which clients can prefix on many PaaS routers. Redis exists (`redis.ts`) but is unused here.

**Assumption-based point:** Confirm whether the Heroku router overwrites or appends `X-Forwarded-For`.

**Exploitation:** An attacker can rotate spoofed IPs or spray requests across dynos against PIN, login, TOTP, reset, and upload-intent endpoints.

**Fix:**

- Use a Redis-backed limiter.
- Use the rightmost trusted hop, or Heroku’s connecting IP.
- Fail closed if Redis is unavailable for authentication endpoints.

### M-1 — MT5 passwords are stored and returned in plaintext

**Severity:** Medium  
**Confidence:** Confirmed  
**Affected:** `apps/web/src/db/schema/trade-accounts.ts` (`password`, `investorPassword` text); `listTradeAccountsByTrader` returns them

**Description:** Trader `POST /trade-accounts` writes master and investor passwords as cleartext. Super Admin list responses strip them, but the trader API does not.

**Impact:** A database dump (C-1) or XSS on the dashboard exposes live trading logins.

**Fix:**

- Encrypt credentials at rest with a KMS or application key.
- Return them only to the owning trader over HTTPS when strictly necessary.
- Never log them.

### M-2 — Admin TOTP has no rate limit and the secret is stored plaintext

**Severity:** Medium  
**Confidence:** Confirmed  
**Affected:** `apps/web/src/app/api/admin/auth/verify-totp/route.ts` (no `checkRateLimit`); `admin_users.totp_secret`

**Description:** After password verification, a five-minute pending cookie allows unlimited six-digit guesses. `setup-totp` also returns the secret in JSON (needed for QR provisioning, but an XSS on that page would steal it).

**Impact:** A stolen password plus unthrottled TOTP guessing can result in a Super Admin session.

**Fix:**

- Rate-limit TOTP verification.
- Lock pending tokens after repeated failures.
- Encrypt TOTP secrets.
- Invalidate the pending cookie after a defined number of failures.

### M-3 — Six-digit PIN OTP; password reset does not invalidate sessions

**Severity:** Medium  
**Confidence:** Confirmed  
**Affected:** `partner-pin-reset.ts` `randomInt(100000, 1000000)`; `auth/reset/route.ts` `completePasswordReset` (no revoke); trader `PATCH` password handling

**Description:** The OTP space is 900,000 values. Reset tokens (32 random bytes) are stored plaintext in `traders.reset_token`. A successful reset leaves existing seven-day cookies valid.

**Fix:**

- Use a longer OTP or hashed one-time links.
- Add `sessions_revoked_at` per trader.
- Hash reset tokens at rest.

### M-4 — Pending payout race condition (TOCTOU)

**Severity:** Medium  
**Confidence:** Confirmed  
**Affected:** `createPartnerPayoutRequest` uses a transaction plus `findPending` then inserts; the schema index on `(partnerId, status)` is not unique

**Exploitation:** Two concurrent `POST` requests can both see no pending row and both insert. The amount is capped per request by available balance, but the “one pending” rule is bypassable.

**Fix:**

- Add a partial unique index where `status = 'pending'`.
- Use `SELECT … FOR UPDATE`.

### M-5 — Negative `fee_markup` enables free evaluations billed against FT9ja wholesale

**Severity:** Medium  
**Confidence:** Confirmed  
**Affected:** `partners.feeMarkup` numeric field without a minimum; `getTraderPrice = base + markup`; evaluations `POST` only checks `amountsMatch` against that price

**Exploitation:** A partner admin can set markup to `-145000`, allowing guests to “pay” ₦0 while Super Admin may still verify the evaluation. Partner earnings become negative and are clamped to zero for payouts; FT9ja still services the evaluation.

**Fix:**

- Enforce server-side `fee_markup >= 0` with a sane maximum.
- Ignore the client-supplied amount entirely.

### M-6 — CSP permits `unsafe-inline` and `unsafe-eval`; `img-src` and `connect-src` allow all HTTPS

**Severity:** Medium  
**Confidence:** Confirmed  
**Affected:** `apps/web/next.config.js` lines 2–16

**Impact:** Any XSS, including a stored description or future sink, becomes full session use despite `HttpOnly` cookies because same-origin requests can still be made. `frame-ancestors 'self'` is otherwise appropriate.

**Fix:**

- Use nonce-based CSP.
- Remove `unsafe-eval`.
- Restrict `img-src` and `connect-src`.

### M-7 — `payment_proof_url` is an unconstrained string

**Severity:** Medium  
**Confidence:** Confirmed  
**Affected:** Evaluations `POST`; `uploadPartnerLicenseReceipt` writes the URL without an S3 prefix check (KYC URLs are checked)

**Description:** Stored `javascript:` or external URLs could be rendered in an admin UI, and a future consumer could treat them as a trusted fetch target, creating SSRF or confused-deputy risk. Today, Super Admin receipt signing parses the S3 URL and prefix and fails closed for mismatched URLs. The current risk is the UI and future fetchers.

**Fix:** Apply the same allowlist used for KYC: parse the S3 object URL and require `uploads/receipts/{slug}/`.

### M-8 — HMAC keys share `BETTER_AUTH_SECRET` / `AUTH_SECRET` fallbacks

**Severity:** Medium  
**Confidence:** Confirmed  
**Affected:** `apps/web/src/lib/auth-secret.ts`

**Impact:** One leaked secret can forge trader sessions, partner-admin sessions, Super Admin sessions, setup tokens, and upload intents.

**Fix:** Require distinct production secrets for each trust domain and remove the fallback chain.

### M-9 — `/admin/docs` is an unauthenticated client page

**Severity:** Medium  
**Confidence:** Confirmed  
**Affected:** `apps/web/src/app/admin/docs/page.tsx` (`'use client'`, no `requireAdmin`); `admin/[tab]/page.tsx` also has no server-side auth wrapper

**Impact:** The page exposes the full endpoint map, cookie names, and HMAC cookie format in the JavaScript bundle.

**Fix:**

- Add a server-side admin gate.
- Do not ship internal documentation to production.

### M-10 — Unauthenticated email and slug enumeration

**Severity:** Medium  
**Confidence:** Confirmed  
**Affected:** `GET /api/partners/check-email` (`available: false, reason: 'taken'`); `check-slug` distinguishes reserved from taken (the UI hides this, but the API does not)

**Fix:**

- Return a constant response body.
- Rate-limit the endpoints.
- Keep reserved-only validation client-side as already intended.

### L-1 — WebP detector accepts any RIFF file

**Severity:** Low  
**Confidence:** Confirmed  
**Affected:** `upload-validation.ts` lines 9–15

**Description:** The detector treats any file beginning with the RIFF magic bytes (`52 49 46 46`) as WebP.

### L-2 — License invoice `GET` issues renewals

**Severity:** Low  
**Confidence:** Confirmed  
**Affected:** `license-invoices/route.ts` lines 22–26 (skipped for read-only)

**Description:** Same-site Lax cookies on `*.ft9ja.com` make this state-changing `GET` a CSRF footgun.

### L-3 — No CI security controls; Redis is unused

**Severity:** Low  
**Confidence:** Confirmed  
**Affected:** No `.github/` workflows; `getRedisClient()` is unused by rate limits

## 3. Attack Chains

- **C-1 → everything:** Clone-script URLs allow an attacker to dump TOTP secrets, MT5 passwords, KYC, and bank accounts. No application exploit is needed.
- **H-2 + H-4 + M-7:** Mint an upload intent, put a fake receipt on S3, and create a pending partner or evaluation using a leaked `owner_email`; then pressure Super Admin to “verify.”
- **H-6 + M-2/M-3:** Bypass the limiter, brute-force TOTP after password phishing, or brute-force PIN OTP after a forgot-PIN request; then use H-5 as a platform-wide logout smoke screen.
- **H-3:** Steal a `view_token` from browser history and read KYC JSON and activation codes for an hour without a Super Admin cookie.
- **H-1:** Squat emails at scale through the unthrottled evaluation `POST`, locking competitors’ customers out of every firm.

## 4. Secure Design Recommendations

### Authentication

- Use per-subject session versioning rather than one global revocation watermark.
- Use separate HMAC keys.
- Use `__Host-` cookies.
- Make impersonation tokens single-use and never place them in query strings.
- Rate-limit TOTP and PIN verification in Redis.

### Tenancy

- Use separate public-partner and admin DTOs.
- Derive the tenant from the session, not only from the URL slug. The HMAC slug binding should remain, with a database existence check after cache lookup.

### Uploads and payments

- Make each upload intent reference a server-side checkout or signup row.
- Validate every stored URL as a tenant-prefixed S3 object.
- Cap markup at `>= 0`.
- Enforce unique pending payouts.

### Data protection

- Encrypt TOTP secrets and MT5 passwords.
- Hash reset tokens.
- Stop storing owner PII in public `GET` responses.

### CI/CD

- Add gitleaks and SAST.
- Run `yarn npm audit`.
- Block commits containing password-bearing `postgresql://` URLs.
- Keep `yarn.lock` committed and fail deployment if it drifts.

### CSP

- Use nonce-based scripts.
- Remove `unsafe-eval`.

## 5. Review Limitations

Live attacks, browser CSRF proofs, and Neon logins were not run. C-1 must be rotated, not tested from here.

## 6. Follow-up Findings

The auth, tenancy, upload, and infrastructure reviews added five High issues that were missing or under-ranked in the first report. They are now on Security Audit as **27 findings: 1 Critical, 11 High, 12 Medium, and 3 Low**.

### H-7 — Guest KYC IDOR

**Severity:** High  
**Confidence:** Confirmed

Unauthenticated `POST /api/partners/{slug}/evaluations` reuses an existing trader on that firm (`traderEmailSignupDecision → reuse`) and returns `toPublicTrader()`, which still includes KYC ID number, address, and document URLs. This is not only email lockout; it is a KYC read.

### H-8 — License freeze bypass

**Severity:** High  
**Confidence:** Confirmed

Partner admin can `POST` any `payment_proof_url`. The status becomes `receipt_uploaded`, and `isLicenseStorefrontFrozen` treats that state as unfrozen (`partner-license-billing.ts` lines 348–354).

### H-9 — Pending and suspended partners can still sell

**Severity:** High  
**Confidence:** Confirmed

`assertPartnerStorefrontOpen` checks license freeze only, not `partners.status`. Apply-pending and Super Admin-suspended slugs still accept registration and checkout.

### H-10 — Payout double-pay

**Severity:** High  
**Confidence:** Confirmed

Two concurrent pending rows can be created. The available amount is calculated as `max(earnings - reserved, 0)`, then `effectiveAvailable = available + alreadyReserved`, allowing Super Admin to pay both requests.

### H-11 — Cross-tenant receipt presigning

**Severity:** High  
**Confidence:** Confirmed

An attacker can plant a known S3 receipt URL as another tenant’s `payment_proof_url`. `ownsLegacyReceipt` plus the `uploads/receipts/` prefix then mints a five-minute `GET` URL.

### Additional confirmed observations

- **HTML injection in FT9ja emails:** `firm_name` and `trader_name` are not escaped.
- **Read-only session overwrite:** `GET admin-view` overwrites a 12-hour write cookie with a one-hour read-only session.
- **Approved KYC can be resubmitted:** Existing KYC approval does not prevent resubmission.
- **`/admin/emails` is public:** It is exposed like `/admin/docs`.

No read-only partner-admin write bypass was found. Production cron still denies requests when `CRON_SECRET` is unset.

