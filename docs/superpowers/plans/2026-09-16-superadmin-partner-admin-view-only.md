# Super Admin Partner Admin View-Only Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Super Admin open any partner `{slug}/admin` as a 1-hour read-only session without the partner PIN, with writes blocked at the API.

**Architecture:** Super Admin mints a slug-bound HMAC token (same pattern as trader dashboard view tokens). The partner subdomain exchanges it for a 1-hour HttpOnly `mode: 'readonly'` partner-admin cookie and redirects to `/admin`. `requirePartnerAdmin` exposes `readOnly`; mutation routes use `requirePartnerAdminWrite`.

**Tech Stack:** Next.js App Router, signed HMAC tokens (`getAdminSessionSecret` / `getPartnerAdminSessionSecret`), Vitest, existing partner-admin session cookies.

## Global Constraints

- Super Admin View is always read-only; PIN login is not offered as a Super Admin fallback.
- Writes stay on Super Admin `/admin` or a real PIN session.
- View token TTL is 1 hour; read-only cookie TTL is 1 hour (not the 12-hour PIN session).
- No Super Admin cookie `Domain=` change.
- GET license invoices in read-only mode must not auto-issue or email a renewal.
- POST receipts (presign) remains allowed for read-only.
- Partner-admin file uploads must reject read-only sessions.
- Do not git commit unless the user explicitly asked for a commit.
- Use Drizzle for any database work (none expected here).
- Place imports at the top of each module.
- Switch statements over unions must use a `never` default.

## File map

- Create: `apps/web/src/lib/admin-partner-admin-view-token.ts` — mint/verify Super Admin partner-admin view tokens.
- Create: `apps/web/src/lib/admin-partner-admin-view-token.test.ts`
- Create: `apps/web/src/app/api/admin/partner-admin-view-token/route.ts` — Super Admin mint endpoint.
- Create: `apps/web/src/app/api/partners/[slug]/admin-view/route.ts` — bounce that sets the read-only cookie and redirects to `/admin`.
- Modify: `apps/web/src/lib/partner-admin-session.ts` — optional `mode: 'readonly'`, 1-hour cookie/token TTL for that mode.
- Modify: `apps/web/src/lib/partner-admin-auth-guard.ts` — `readOnly` on context; `requirePartnerAdminWrite`.
- Modify: `apps/web/src/lib/partner-admin-security.test.ts` — session mode + guard tests.
- Modify: `apps/web/src/lib/upload-auth.ts` — deny uploads for read-only partner-admin sessions.
- Modify: partner mutation routes listed in Task 4 — `requirePartnerAdminWrite`.
- Modify: `apps/web/src/app/api/partners/[slug]/license-invoices/route.ts` — skip renewal side effect when read-only.
- Modify: `apps/web/src/app/api/partners/[slug]/verify-pin/route.ts` — GET returns `readOnly`.
- Modify: `apps/web/src/app/admin/page.tsx` — Partners **View** mints token and opens bounce URL.
- Modify: `apps/web/src/app/[slug]/admin/page.tsx` — banner, hide writes, Exit view.
- Modify: `apps/web/src/app/admin/docs/page.tsx` — document the flow.

---

### Task 1: View token + read-only session payload

**Files:**
- Create: `apps/web/src/lib/admin-partner-admin-view-token.ts`
- Create: `apps/web/src/lib/admin-partner-admin-view-token.test.ts`
- Modify: `apps/web/src/lib/partner-admin-session.ts`
- Modify: `apps/web/src/lib/partner-admin-security.test.ts`

**Interfaces:**
- Consumes: `getAdminSessionSecret()`, existing HMAC cookie helpers in `partner-admin-session.ts`.
- Produces:
  - `PARTNER_ADMIN_VIEW_TOKEN_MAX_AGE = 60 * 60`
  - `createAdminPartnerAdminViewToken({ slug: string }): string`
  - `verifyAdminPartnerAdminViewToken(token: string, slug: string): boolean`
  - `PARTNER_ADMIN_VIEW_SESSION_MAX_AGE = 60 * 60`
  - `PartnerAdminSessionPayload.mode?: 'readonly'`
  - `createPartnerAdminSessionToken({ partnerId, slug, mode? })` uses 1-hour exp when `mode === 'readonly'`
  - `createPartnerAdminSessionCookie(slug, token, { secure?, maxAge? })`

- [ ] **Step 1: Write the failing token tests**

Create `apps/web/src/lib/admin-partner-admin-view-token.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  createAdminPartnerAdminViewToken,
  verifyAdminPartnerAdminViewToken,
} from '@/lib/admin-partner-admin-view-token';

describe('admin partner-admin view token', () => {
  it('creates a token bound to slug', () => {
    const token = createAdminPartnerAdminViewToken({ slug: 'acme' });
    expect(verifyAdminPartnerAdminViewToken(token, 'acme')).toBe(true);
    expect(verifyAdminPartnerAdminViewToken(token, 'other')).toBe(false);
    expect(verifyAdminPartnerAdminViewToken('not-a-token', 'acme')).toBe(false);
  });
});
```

Add to `apps/web/src/lib/partner-admin-security.test.ts` inside the existing `partner admin session` describe:

```ts
it('creates a read-only session with 1-hour expiry', () => {
  const token = createPartnerAdminSessionToken({
    partnerId: 9,
    slug: 'acme',
    mode: 'readonly',
  });
  const session = verifyPartnerAdminSessionToken(token);
  expect(session?.mode).toBe('readonly');
  expect(session?.exp).toBeGreaterThan(Date.now());
  expect(session?.exp).toBeLessThanOrEqual(Date.now() + 60 * 60 * 1000 + 1000);
});

it('omits mode on PIN sessions', () => {
  const token = createPartnerAdminSessionToken({ partnerId: 9, slug: 'acme' });
  const session = verifyPartnerAdminSessionToken(token);
  expect(session?.mode).toBeUndefined();
});
```

Update the `createPartnerAdminSessionToken` import if `mode` is not yet on the type (test should fail to compile/run until Step 3).

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
yarn workspace web exec vitest run src/lib/admin-partner-admin-view-token.test.ts src/lib/partner-admin-security.test.ts
```

Expected: FAIL because `admin-partner-admin-view-token` does not exist and session tokens have no `mode`.

- [ ] **Step 3: Implement token + session mode**

Create `apps/web/src/lib/admin-partner-admin-view-token.ts` mirroring `apps/web/src/lib/admin-trader-view-token.ts`, slug-only:

```ts
import crypto from 'crypto';
import { getAdminSessionSecret } from '@/lib/auth-secret';

export const PARTNER_ADMIN_VIEW_TOKEN_MAX_AGE = 60 * 60;

export interface AdminPartnerAdminViewTokenPayload {
  slug: string;
  exp: number;
}

function sign(encoded: string) {
  return crypto.createHmac('sha256', getAdminSessionSecret()).update(encoded).digest('hex');
}

export function createAdminPartnerAdminViewToken(payload: { slug: string }) {
  const encoded = Buffer.from(
    JSON.stringify({
      slug: payload.slug,
      exp: Date.now() + PARTNER_ADMIN_VIEW_TOKEN_MAX_AGE * 1000,
    } satisfies AdminPartnerAdminViewTokenPayload)
  ).toString('base64url');
  return `${encoded}.${sign(encoded)}`;
}

export function verifyAdminPartnerAdminViewToken(token: string, slug: string): boolean {
  try {
    const lastDot = token.lastIndexOf('.');
    if (lastDot < 0) return false;
    const encoded = token.slice(0, lastDot);
    const sig = token.slice(lastDot + 1);
    const expected = sign(encoded);
    if (sig.length !== expected.length) return false;
    if (!crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))) {
      return false;
    }
    const parsed = JSON.parse(
      Buffer.from(encoded, 'base64url').toString()
    ) as AdminPartnerAdminViewTokenPayload;
    if (parsed.exp < Date.now()) return false;
    return parsed.slug === slug;
  } catch {
    return false;
  }
}
```

In `apps/web/src/lib/partner-admin-session.ts`:

- Add `export const PARTNER_ADMIN_VIEW_SESSION_MAX_AGE = 60 * 60;`
- Add `mode?: 'readonly'` to `PartnerAdminSessionPayload`.
- Change `createPartnerAdminSessionToken` to accept optional `mode` and set `exp` with `PARTNER_ADMIN_VIEW_SESSION_MAX_AGE` when `mode === 'readonly'`, otherwise `PARTNER_ADMIN_SESSION_MAX_AGE`. Include `mode` in the signed payload only when it is `'readonly'`.
- Extend `createPartnerAdminSessionCookie` options with `maxAge?: number` and pass `options.maxAge ?? PARTNER_ADMIN_SESSION_MAX_AGE` into `buildCookie`.

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
yarn workspace web exec vitest run src/lib/admin-partner-admin-view-token.test.ts src/lib/partner-admin-security.test.ts
```

Expected: PASS.

---

### Task 2: Auth guard + upload denial

**Files:**
- Modify: `apps/web/src/lib/partner-admin-auth-guard.ts`
- Modify: `apps/web/src/lib/partner-admin-security.test.ts`
- Modify: `apps/web/src/lib/upload-auth.ts`

**Interfaces:**
- Consumes: `parsePartnerAdminSessionFromRequest` (now may include `mode`).
- Produces:
  - `PartnerAdminContext = { partnerId: number; slug: string; readOnly: boolean }`
  - `requirePartnerAdmin(request, slug): Promise<PartnerAdminContext | Response>`
  - `requirePartnerAdminWrite(request, slug): Promise<PartnerAdminContext | Response>` — 401 if unauthenticated, 403 `{ error: 'This partner admin session is read-only' }` if `readOnly`.

- [ ] **Step 1: Write the failing guard tests**

Add to `apps/web/src/lib/partner-admin-security.test.ts`:

```ts
import {
  isPartnerAdminUnauthorized,
  requirePartnerAdmin,
  requirePartnerAdminWrite,
} from '@/lib/partner-admin-auth-guard';
import {
  createPartnerAdminSessionCookie,
  createPartnerAdminSessionToken,
  getPartnerAdminCookieName,
} from '@/lib/partner-admin-session';

function sessionRequest(slug: string, mode?: 'readonly') {
  const token = createPartnerAdminSessionToken({
    partnerId: 9,
    slug,
    ...(mode ? { mode } : {}),
  });
  const cookie = createPartnerAdminSessionCookie(slug, token, {
    maxAge: mode === 'readonly' ? 60 * 60 : undefined,
  });
  const value = cookie.split(';')[0];
  return new Request('https://acme.ft9ja.com/admin', {
    headers: { cookie: value },
  });
}

describe('partner admin auth guard', () => {
  it('marks PIN sessions as writable', async () => {
    const auth = await requirePartnerAdmin(sessionRequest('acme'), 'acme');
    expect(isPartnerAdminUnauthorized(auth)).toBe(false);
    if (isPartnerAdminUnauthorized(auth)) return;
    expect(auth.readOnly).toBe(false);
    const write = await requirePartnerAdminWrite(sessionRequest('acme'), 'acme');
    expect(isPartnerAdminUnauthorized(write)).toBe(false);
  });

  it('forbids writes for read-only sessions', async () => {
    const auth = await requirePartnerAdmin(sessionRequest('acme', 'readonly'), 'acme');
    expect(isPartnerAdminUnauthorized(auth)).toBe(false);
    if (isPartnerAdminUnauthorized(auth)) return;
    expect(auth.readOnly).toBe(true);
    const write = await requirePartnerAdminWrite(sessionRequest('acme', 'readonly'), 'acme');
    expect(write).toBeInstanceOf(Response);
    if (!(write instanceof Response)) return;
    expect(write.status).toBe(403);
  });
});
```

Remove the unused `getPartnerAdminCookieName` import if unused.

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
yarn workspace web exec vitest run src/lib/partner-admin-security.test.ts
```

Expected: FAIL because `readOnly` and `requirePartnerAdminWrite` do not exist.

- [ ] **Step 3: Implement guard + upload denial**

Replace `apps/web/src/lib/partner-admin-auth-guard.ts` with:

```ts
import { parsePartnerAdminSessionFromRequest } from '@/lib/partner-admin-session';

export type PartnerAdminContext = {
  partnerId: number;
  slug: string;
  readOnly: boolean;
};

export function isPartnerAdminUnauthorized(
  result: PartnerAdminContext | Response
): result is Response {
  return result instanceof Response;
}

export async function requirePartnerAdmin(
  request: Request,
  slug: string
): Promise<PartnerAdminContext | Response> {
  const session = await parsePartnerAdminSessionFromRequest(request, slug);
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!session.partnerId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return {
    partnerId: session.partnerId,
    slug,
    readOnly: session.mode === 'readonly',
  };
}

export async function requirePartnerAdminWrite(
  request: Request,
  slug: string
): Promise<PartnerAdminContext | Response> {
  const auth = await requirePartnerAdmin(request, slug);
  if (isPartnerAdminUnauthorized(auth)) return auth;
  if (auth.readOnly) {
    return Response.json(
      { error: 'This partner admin session is read-only' },
      { status: 403 }
    );
  }
  return auth;
}
```

In `apps/web/src/lib/upload-auth.ts`, after a successful `parsePartnerAdminSessionFromRequest`, treat `partnerAdmin.mode === 'readonly'` as not authorized via that session (fall through). Do not allow the read-only cookie to authorize uploads.

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
yarn workspace web exec vitest run src/lib/partner-admin-security.test.ts
```

Expected: PASS.

---

### Task 3: Mint endpoint + bounce route

**Files:**
- Create: `apps/web/src/app/api/admin/partner-admin-view-token/route.ts`
- Create: `apps/web/src/app/api/partners/[slug]/admin-view/route.ts`

**Interfaces:**
- Consumes: `requireAdmin`, `createAdminPartnerAdminViewToken`, `verifyAdminPartnerAdminViewToken`, `getPartnerIdBySlug`, `normalizePartnerSlug`, `isValidPartnerSlug`, `createPartnerAdminSessionToken`, `createPartnerAdminSessionCookie`, `PARTNER_ADMIN_VIEW_SESSION_MAX_AGE`.
- Produces:
  - `POST /api/admin/partner-admin-view-token` body `{ slug }` → `{ view_token, expires_in_seconds: 3600 }` (401 without Super Admin, 400 invalid slug, 404 unknown partner).
  - `GET /api/partners/[slug]/admin-view?token=` verifies token, sets read-only cookie, 302 to `/admin`. Invalid token 401. Unknown partner 404.

- [ ] **Step 1: Add the mint route**

Create `apps/web/src/app/api/admin/partner-admin-view-token/route.ts` using `apps/web/src/app/api/admin/trader-view-token/route.ts` as the template. Differences: no email; body is `{ slug }`; call `createAdminPartnerAdminViewToken({ slug })`.

```ts
import { isAdminUnauthorized, requireAdmin } from '@/lib/admin-auth-guard';
import { createAdminPartnerAdminViewToken } from '@/lib/admin-partner-admin-view-token';
import { PARTNER_ADMIN_VIEW_TOKEN_MAX_AGE } from '@/lib/admin-partner-admin-view-token';
import { getPartnerIdBySlug } from '@/db/queries/partners';
import { isValidPartnerSlug, normalizePartnerSlug } from '@/lib/tenant';

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (isAdminUnauthorized(auth)) return auth;

  try {
    const body = await request.json();
    const slug = normalizePartnerSlug(String(body.slug || ''));

    if (!slug || !isValidPartnerSlug(slug)) {
      return Response.json({ error: 'slug is required' }, { status: 400 });
    }

    const partnerId = await getPartnerIdBySlug(slug);
    if (!partnerId) {
      return Response.json({ error: 'Partner not found' }, { status: 404 });
    }

    const view_token = createAdminPartnerAdminViewToken({ slug });
    return Response.json({
      view_token,
      expires_in_seconds: PARTNER_ADMIN_VIEW_TOKEN_MAX_AGE,
    });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to create view token' }, { status: 500 });
  }
}
```

Combine the two imports from `admin-partner-admin-view-token` into one.

- [ ] **Step 2: Add the bounce route**

Create `apps/web/src/app/api/partners/[slug]/admin-view/route.ts`:

```ts
import { getPartnerIdBySlug } from '@/db/queries/partners';
import { verifyAdminPartnerAdminViewToken } from '@/lib/admin-partner-admin-view-token';
import {
  PARTNER_ADMIN_VIEW_SESSION_MAX_AGE,
  createPartnerAdminSessionCookie,
  createPartnerAdminSessionToken,
} from '@/lib/partner-admin-session';

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const token = new URL(request.url).searchParams.get('token') || '';

  if (!verifyAdminPartnerAdminViewToken(token, slug)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const partnerId = await getPartnerIdBySlug(slug);
  if (!partnerId) {
    return Response.json({ error: 'Partner not found' }, { status: 404 });
  }

  const sessionToken = createPartnerAdminSessionToken({
    partnerId,
    slug,
    mode: 'readonly',
  });
  const redirectUrl = new URL('/admin', request.url);
  const res = Response.redirect(redirectUrl, 302);
  res.headers.set(
    'Set-Cookie',
    createPartnerAdminSessionCookie(slug, sessionToken, {
      secure: process.env.NODE_ENV === 'production',
      maxAge: PARTNER_ADMIN_VIEW_SESSION_MAX_AGE,
    })
  );
  return res;
}
```

- [ ] **Step 3: Typecheck the new routes**

Run:

```bash
yarn workspace web exec tsc --noEmit --pretty false
```

Expected: no errors in the new files. If `Response.redirect` plus `headers.set` is awkward in the runtime, build the redirect with `new Response(null, { status: 302, headers: { Location: redirectUrl.toString(), 'Set-Cookie': ... } })` instead.

---

### Task 4: Enforce read-only on partner APIs

**Files:**
- Modify: `apps/web/src/app/api/partners/[slug]/traders/route.ts` — POST only → `requirePartnerAdminWrite`. GET stays `requirePartnerAdmin`.
- Modify: `apps/web/src/app/api/partners/[slug]/traders/[id]/kyc/route.ts` — PATCH (and any partner-admin write) → `requirePartnerAdminWrite`.
- Modify: `apps/web/src/app/api/partners/[slug]/payout-requests/route.ts` — POST → `requirePartnerAdminWrite`. GET stays `requirePartnerAdmin`.
- Modify: `apps/web/src/app/api/partners/[slug]/license-invoices/route.ts` — POST → `requirePartnerAdminWrite`. GET stays `requirePartnerAdmin` but skip `issueAndNotifyRenewalForPartner` when `auth.readOnly`.
- Modify: `apps/web/src/app/api/partners/[slug]/generate-logo/route.ts` — POST → `requirePartnerAdminWrite`.
- Modify: `apps/web/src/app/api/partners/[slug]/evaluations/route.ts` — POST → `requirePartnerAdminWrite`. GET list remains `requirePartnerAdmin`.
- Modify: `apps/web/src/app/api/partners/[slug]/evaluations/[id]/route.ts` — PATCH → `requirePartnerAdminWrite`.
- Modify: `apps/web/src/app/api/partners/[slug]/route.ts` — when `needsPartnerAdmin && !hasSuperAdminAuth`, use `requirePartnerAdminWrite`.
- Modify: `apps/web/src/app/api/partners/[slug]/verify-pin/route.ts` — GET returns `{ authenticated: true, readOnly: auth.readOnly }`. DELETE may still clear the cookie (Exit view).
- Do **not** change `apps/web/src/app/api/partners/[slug]/receipts/route.ts` (presign stays allowed).

**Interfaces:**
- Consumes: `requirePartnerAdminWrite`, `auth.readOnly`.
- Produces: 403 on writes for read-only cookies; GET verify-pin includes `readOnly: boolean`.

- [ ] **Step 1: Switch mutation handlers to `requirePartnerAdminWrite`**

At the top of each mutation file, import `requirePartnerAdminWrite` next to `requirePartnerAdmin` (keep `requirePartnerAdmin` on GET). Replace the write-handler call:

```ts
const auth = await requirePartnerAdminWrite(request, slug);
if (isPartnerAdminUnauthorized(auth)) return auth;
```

`isPartnerAdminUnauthorized` still works because write failures are also `Response`.

In `apps/web/src/app/api/partners/[slug]/route.ts` PATCH, replace the `requirePartnerAdmin` call inside `needsPartnerAdmin && !hasSuperAdminAuth` with `requirePartnerAdminWrite`. Super Admin PATCH of `status` / `monthly_fee_paid` must remain `requireAdmin` and must not depend on the partner cookie.

- [ ] **Step 2: Skip license renewal side effect when read-only**

In `GET` of `apps/web/src/app/api/partners/[slug]/license-invoices/route.ts`:

```ts
const auth = await requirePartnerAdmin(request, slug);
if (isPartnerAdminUnauthorized(auth)) return auth;

try {
  if (!auth.readOnly) {
    await issueAndNotifyRenewalForPartner(auth.partnerId, new Date(), {
      allowSuspended: true,
    });
  }

  const [invoices, coverage] = await Promise.all([
    listLicenseInvoicesForPartner(auth.partnerId),
    getPartnerLicenseCoverage(auth.partnerId),
  ]);
  // ...unchanged response
```

- [ ] **Step 3: Return `readOnly` from session check**

In `GET` of `apps/web/src/app/api/partners/[slug]/verify-pin/route.ts`:

```ts
const auth = await requirePartnerAdmin(_request, slug);
if (isPartnerAdminUnauthorized(auth)) return auth;
return Response.json({ authenticated: true, readOnly: auth.readOnly });
```

- [ ] **Step 4: Run unit tests**

Run:

```bash
yarn workspace web exec vitest run src/lib/partner-admin-security.test.ts src/lib/admin-partner-admin-view-token.test.ts
```

Expected: PASS.

---

### Task 5: Super Admin Partners View button

**Files:**
- Modify: `apps/web/src/app/admin/page.tsx` (Partners list **View** around the existing `getPartnerUrl(p.slug, '/admin')` link)

**Interfaces:**
- Consumes: `POST /api/admin/partner-admin-view-token`, `getPartnerUrl(slug, path)`.
- Produces: button that opens `{slug}.ft9ja.com/api/partners/{slug}/admin-view?token=...` in a new tab.

- [ ] **Step 1: Replace the plain `/admin` link**

In the Partners list (same component that currently renders `<Link href={getPartnerUrl(p.slug, '/admin')}>`), change **View** from a `Link` to a button. Add a handler next to other partner actions in that component (follow `openTraderDashboard` in Trade Accounts):

```ts
const openPartnerAdminView = async (slug: string) => {
  try {
    const res = await fetch('/api/admin/partner-admin-view-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { view_token?: string };
    if (!data.view_token) return;
    const path = `/api/partners/${slug}/admin-view?token=${encodeURIComponent(data.view_token)}`;
    window.open(getPartnerUrl(slug, path), '_blank', 'noopener,noreferrer');
  } catch (error) {
    console.error('Failed to open partner admin view:', error);
  }
};
```

Keep the Eye icon and **View** label. Disable the button while that slug’s request is in flight if easy; otherwise fire-and-forget like Trade Accounts.

Keep `getPartnerUrl` import as-is.

- [ ] **Step 2: Confirm there is no other Super Admin deep link to `/{slug}/admin` that should stay a PIN login**

Search `apps/web/src/app/admin` for `getPartnerUrl(..., '/admin')`. Convert every Super Admin “open partner admin” control to the bounce. Leave email templates that tell *partners* to visit `/admin` unchanged.

---

### Task 6: Partner admin read-only UI

**Files:**
- Modify: `apps/web/src/app/[slug]/admin/page.tsx`

**Interfaces:**
- Consumes: `GET /api/partners/${slug}/verify-pin` → `{ authenticated, readOnly }`.
- Produces: skip PIN when session exists; `viewOnly` banner; hidden write controls; Exit view → view-ended state (not PIN form).

- [ ] **Step 1: Track `viewOnly` and `viewEnded` from the session check**

Add `useState` for `viewOnly` (boolean) and `viewEnded` (boolean). In `checkSession`, parse JSON:

```ts
const res = await partnerAdminFetch(`/api/partners/${slug}/verify-pin`);
if (!cancelled) {
  if (res.ok) {
    const data = (await res.json()) as { readOnly?: boolean };
    setPinAuthed(true);
    setViewOnly(Boolean(data.readOnly));
    setViewEnded(false);
  } else {
    setPinAuthed(false);
    setViewOnly(false);
  }
}
```

If `!pinAuthed && viewEnded`, render a centered card: **View ended** / “This Super Admin view-only session has been closed.” / link `← Back to {slug}.ft9ja.com` (`href={\`/${slug}\`}`). Do not render the PIN form.

If `!pinAuthed && !viewEnded`, keep the existing PIN gate (real partner admins).

- [ ] **Step 2: Banner + Exit view**

Copy the trader dashboard banner pattern from `ViewOnlyBanner` in `apps/web/src/[slug]/dashboard/page.tsx` (Eye icon, gray box). Copy:

“Viewing partner admin (read-only)”
“Changes must be made in Super Admin or by the partner.”

Place it at the top of the authenticated layout (below the nav, above tabs).

Replace **Lock** when `viewOnly`:

```tsx
<button
  type="button"
  onClick={async () => {
    await partnerAdminFetch(`/api/partners/${slug}/verify-pin`, { method: 'DELETE' });
    setPinAuthed(false);
    setViewOnly(false);
    setViewEnded(true);
  }}
>
  Exit view
</button>
```

When `!viewOnly`, keep Lock as today.

- [ ] **Step 3: Hide or disable write controls when `viewOnly`**

- Do not render Add Trader or the add-trader form.
- Do not render KYC Approve / Reject.
- Pass `viewOnly` into `PayoutsTab` and hide the request-payout form/button.
- Settings: disable branding inputs, hide Save Markup / Save Branding / Generate Logo / Apply generated logo / Update PIN (show values as read-only text/inputs `disabled`).
- License: hide the receipt file input and Upload Receipt CTA; keep invoice/coverage display and receipt *view* buttons (`openReceipt` stays enabled).
- Do not disable tab navigation or receipt viewing.

- [ ] **Step 4: Typecheck**

Run:

```bash
yarn workspace web exec tsc --noEmit --pretty false
```

Expected: no new errors in `page.tsx`.

---

### Task 7: Docs + verification

**Files:**
- Modify: `apps/web/src/app/admin/docs/page.tsx`
- Modify: `AGENTS.md` only if the existing Super Admin / partner-admin bullet would be wrong after this change.

**Interfaces:**
- Consumes: the shipped View → bounce → read-only cookie flow.
- Produces: docs that match behavior.

- [ ] **Step 1: Update Super Admin docs**

In `apps/web/src/app/admin/docs/page.tsx`, change the **View Partner Admin** row to:

“Opens `{slug}.ft9ja.com/admin` as a 1-hour read-only Super Admin session (no PIN, writes blocked)”

In the overview card, change “Access all partner admin pages” to “Open any partner admin as read-only”.

- [ ] **Step 2: Run the focused tests**

Run:

```bash
yarn workspace web exec vitest run src/lib/admin-partner-admin-view-token.test.ts src/lib/partner-admin-security.test.ts
```

Expected: PASS.

- [ ] **Step 3: Browser-verify**

1. Sign in as Super Admin on the reserved host (`/admin`).
2. Partners → **View** on a real partner. Confirm a new tab lands on `{slug}/admin` without the PIN form, with the read-only banner.
3. Confirm overview/traders/payments/payouts/license/analytics/settings render.
4. Confirm write controls are hidden/disabled.
5. Confirm opening a receipt still works.
6. Confirm **Exit view** shows the view-ended card, not PIN login.
7. In Super Admin, confirm Approve/Suspend/license actions still work.
8. Sign in to `{slug}/admin` as the partner (PIN) in a fresh session and confirm writes still work.

If the browser MCP is available, exercise steps 2–6. If not, use curl:

```bash
# mint requires Super Admin cookie; bounce without token must 401
curl -s -o /dev/null -w "%{http_code}" "http://localhost:4000/api/partners/acme/admin-view"
```

Expected: `401`.
