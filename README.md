# interview1

Next.js (App Router) + Supabase Auth + Postgres, deployed on Vercel.

## Run

```bash
pnpm install
cp .env.example .env.local   # fill in, or: vercel env pull .env.local
pnpm dev
```

`pnpm validate` runs the type check, ESLint and Prettier; the Husky pre-push hook runs it
plus `pnpm build`.

## Layout

- `app/auth/*` — email/password sign-up, login, password reset, email confirmation
- `app/protected/*` — signed-in area; `proxy.ts` redirects anonymous users to `/auth/login`
- `components/` — atomic design: `atoms` → `molecules` → `organisms` → `templates`; each level imports only from the levels below (enforced by ESLint)
- `lib/supabase/*` — Supabase clients for the browser, server components and the proxy
- `db/pre-clock.sql` — database setup applied before the assessment

## CI/CD

- GitHub Actions (`.github/workflows/ci.yml`): `pnpm validate` + `pnpm build` on every push to `main` and every pull request.
- Vercel Git integration: every push deploys; `main` goes to production, other branches and pull requests get preview URLs.

See `PRE-CLOCK-SETUP.md` for what existed before the assessment clock started.
