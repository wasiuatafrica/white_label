# Super Admin Partner Admin View-Only Design

## Goal

Let a signed-in Super Admin open any partner's `{slug}/admin` panel without
the partner PIN, and without any writes from that UI. Partner-admin mutations
stay available only to a real PIN session. Super Admin mutations stay on
`/admin`.

## Approaches considered

1. **Token bounce + short-lived read-only cookie (chosen).** Super Admin mints
   a 1-hour slug-bound token (same pattern as trader dashboard view tokens).
   Opening View hits the partner subdomain, which verifies the token, sets a
   1-hour HttpOnly read-only partner-admin cookie, and redirects to `/admin`
   with no token in the URL. APIs treat `mode: readonly` as GET/read access
   only.
2. **Keep `view_token` on the URL for every request.** Matches trader
   dashboards exactly, but leaves a bearer token in the address bar, history,
   and Referer when opening receipts.
3. **Share the Super Admin session cookie on `.ft9ja.com`.** Avoids a new
   token type, but sends the Super Admin cookie to every partner subdomain and
   does not work cleanly on Heroku or localhost.

## Entry

On Super Admin Partners, **View** stops being a plain link to
`{slug}.ft9ja.com/admin`. It POSTs `/api/admin/partner-admin-view-token` with
`{ slug }`, then opens:

`{slug}.ft9ja.com/api/partners/{slug}/admin-view?token=...`

That route verifies the token, sets `ft9ja_partner_admin_{slug}` with
`mode: 'readonly'` and a 1-hour TTL, and 302s to `/admin`. Invalid or expired
tokens return 401 and do not set a cookie.

A leftover PIN write session on the same browser is replaced by the read-only
cookie. Real partner admins continue to PIN-login as today; that path never
sets `mode: 'readonly'`.

## Partner admin UI

When the session is read-only:

- Skip the PIN gate.
- Show a banner: viewing this partner admin (read-only). Changes must be made
  in Super Admin or by the partner.
- Hide or disable write controls: add trader, KYC approve/reject, branding
  save, PIN change, logo generate, payout request, license receipt upload.
- Viewing receipts (presigned GET) remains allowed.
- Replace **Lock** with **Exit view**, which clears the read-only cookie and
  shows a short “view ended” state with a storefront link — not the PIN form.

## API enforcement

`requirePartnerAdmin` returns `{ partnerId, slug, readOnly: boolean }`.

- **Allowed for read-only:** GET traders, evaluations, license invoices,
  partner public profile; GET verify-pin (session check); POST receipts
  (presign only).
- **Blocked with 403 for read-only:** POST/PATCH/DELETE that change partner
  data (traders, KYC, branding/PIN, logo generate, payout requests, license
  receipt upload, evaluations POST). Super Admin PATCH of `status` /
  `monthly_fee_paid` on `/api/partners/[slug]` is unchanged and still uses
  the Super Admin cookie on `/admin`.
- GET license invoices currently may issue a renewal as a side effect. In
  read-only mode it must list coverage only and must not create or email a
  renewal.

Enforcement is on the server. UI hiding is not sufficient.

## Security

- Token is HMAC-signed, bound to `slug`, TTL 1 hour, minted only after
  `requireAdmin`. Replay within the hour can refresh the read-only cookie
  (same control as trader dashboard view tokens; no used-token store).
- Read-only cookie is HttpOnly, SameSite=Lax, host-only on the partner
  subdomain, 1-hour max age (not the 12-hour PIN session).
- No Super Admin cookie `Domain=` change.

## Testing

- Token mint requires Super Admin; missing slug / unknown partner 400/404.
- Bounce sets read-only cookie and redirects; expired or invalid token 401.
- Read-only session can GET partner admin data and presign receipts.
- Read-only session cannot POST/PATCH partner writes (403).
- PIN sessions remain fully writable.
- GET license invoices in read-only mode does not issue a renewal.

## Non-goals

- Super Admin impersonation with write access.
- PIN login as a fallback from the view-only page.
- Sharing the Super Admin session across partner subdomains.
- View-only access to the public storefront (already public).
