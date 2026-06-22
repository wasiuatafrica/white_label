## Learned User Preferences

- Use Drizzle ORM for all database-related implementations (not raw SQL).
- API endpoints should use the Drizzle schema and query layer.
- Database queries must be efficient and fast.
- Schema workflow must support root `db:generate` and `db:push` scripts.
- Do not edit attached plan files when implementing a plan.
- When todos already exist for a plan, mark them in_progress rather than recreating them.
- Partner signup subdomain availability should show only "This subdomain is available." or "This subdomain is unavailable." (do not distinguish reserved vs taken); reserved/invalid slugs (including prefix variations of reserved words) are checked client-side; valid slugs use a debounced (~500ms) DB lookup.

## Learned Workspace Facts

- Yarn 4 workspaces monorepo: `apps/web` (Next.js) and `apps/mobile` (Expo); `publisher/` is outside workspaces.
- Web app targets Neon PostgreSQL via `DATABASE_URL`; Better Auth stays on its Neon `Pool` adapter (separate from the Drizzle app data layer).
- Web app is deployed to Heroku app `landingpage-june` (`Procfile`: `yarn workspace web start`, `heroku-postbuild` builds web); partner sites use `{slug}.ft9ja.com` subdomains.
- On `{slug}.ft9ja.com`, `/admin` uses the partner PIN gate. Reserved subdomains (`partner`, `partners`, etc.) and slugs starting with those words serve the main platform, not partner storefronts; Super Admin at `/admin` on reserved hosts (e.g. `partners.ft9ja.com`).
- Partner AI logo generation uses OpenAI `gpt-image-2` directly (`OPENAI_API_KEY`); one image per API request (Heroku 30s web timeout); up to 3 generations per partner (`logo_generation_count`). Uploads to private `AWS_S3_BUCKET` at `uploads/logos/{slug}/`, served via `/api/partners/[slug]/logo`; store canonical S3 URL in `logo_url` and last preview in `last_generated_logo_url`. `ANYTHING_PROJECT_TOKEN` and `NEXT_PUBLIC_CREATE_BASE_URL` are not required.
- Partner signup subdomain suggestions use OpenAI Responses API with `gpt-5.4-mini` (`apps/web/src/lib/openai/subdomain-suggestions.ts`).
- `partner_signup_events` table and `POST /api/partner-signup-events` track partner signup funnel abandonment from `/apply`.
- Production Next.js builds use `next build --webpack` because Turbopack breaks Better Auth / Kysely bundling.
- Heroku requires `DATABASE_URL`, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL` (use a Neon URL, not Heroku Postgres, for auth); do not use `HEROKU_SKIP_INSTALL=1` with Yarn 4; `.slugignore` runs before install without `!` negation—do not exclude workspace packages needed by `yarn.lock`.
- Drizzle client at `apps/web/src/db/index.ts` (neon-serverless Pool); config at `apps/web/drizzle.config.ts`; schemas in `apps/web/src/db/schema/`, queries in `apps/web/src/db/queries/`.
- Partner eval pricing: fixed FT9ja bases SS ₦145,000 / SSL ₦49,000; 25% partner discount (wholesale = 75% of base) fixed for all partners; partner markup added on top of FT9ja price (trader pays base + markup); partner earnings per sale = 25% of FT9ja base + markup (trader paid − wholesale owed to FT9ja).
- Partner payouts are request-only via `partner_payout_requests` (`{slug}/admin`); Super Admin `/api/admin/payouts` is trader eval payouts only. Markup lives only on `partners.fee_markup` (not snapshotted per evaluation).
