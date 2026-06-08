## Learned User Preferences

- Use Drizzle ORM for all database-related implementations (not raw SQL).
- API endpoints should use the Drizzle schema and query layer.
- Database queries must be efficient and fast.
- Schema workflow must support root `db:generate` and `db:push` scripts.
- Do not edit attached plan files when implementing a plan.
- When todos already exist for a plan, mark them in_progress rather than recreating them.

## Learned Workspace Facts

- Yarn 4 workspaces monorepo: `apps/web` (Next.js) and `apps/mobile` (Expo); `publisher/` is outside workspaces.
- Web app targets Neon PostgreSQL via `DATABASE_URL`; Better Auth stays on its Neon `Pool` adapter (separate from the Drizzle app data layer).
- Web app is deployed to Heroku (`Procfile`: `yarn workspace web start`, `heroku-postbuild` builds web).
- Production Next.js builds use `next build --webpack` because Turbopack breaks Better Auth / Kysely bundling.
- Heroku requires `DATABASE_URL`, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL` (use a Neon URL, not Heroku Postgres, for auth).
- Do not use `HEROKU_SKIP_INSTALL=1` with Yarn 4 on Heroku; it breaks install before scripts run.
- Heroku `.slugignore` runs before install and does not support `!` negation; do not exclude workspace package directories needed by `yarn.lock`.
- Drizzle client at `apps/web/src/db/index.ts` (neon-serverless Pool); config at `apps/web/drizzle.config.ts`; schemas in `apps/web/src/db/schema/`, queries in `apps/web/src/db/queries/`.
