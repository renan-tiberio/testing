# interview1

Next.js (App Router) + Supabase Auth + Postgres, deployed on Vercel.

## Run

```bash
pnpm install
cp .env.example .env.local   # fill in, or: vercel env pull .env.local
pnpm dev
```

## Layout

- `app/auth/*` — email/password sign-up, login, password reset, email confirmation
- `app/protected/*` — signed-in area; `proxy.ts` redirects anonymous users to `/auth/login`
- `lib/supabase/*` — Supabase clients for the browser, server components and the proxy
- `db/pre-clock.sql` — database setup applied before the assessment

See `PRE-CLOCK-SETUP.md` for what existed before the assessment clock started.
