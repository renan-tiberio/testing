# Pre-clock setup

State of this repository before the assessment clock started (2026-10-20).
Everything after the last commit that touches this file was written during the assessment.

## Framework / auth starter

- Created with `pnpm create next-app --example with-supabase` (official Next.js + Supabase example).
- Next.js 16.4.2, React 19.3, TypeScript 5.9, `@supabase/ssr` 0.12.7, `@supabase/supabase-js` 2.118, Tailwind 3, shadcn/ui.
- Kept from the template: email/password auth pages (`/auth/login`, `/auth/sign-up`, `/auth/forgot-password`, `/auth/update-password`, `/auth/confirm`), cookie-based session refresh in `proxy.ts`, Supabase clients in `lib/supabase/`, and a `/protected` area that redirects anonymous users to login.

## Changes to the template before the clock

- Removed the tutorial and marketing pieces (hero, deploy button, logos, tutorial steps, theme switcher, env-var warning, OG images) and the dependencies only they used (`@radix-ui/react-checkbox`, `@radix-ui/react-dropdown-menu`, `lucide-react`).
- Added `components/site-header.tsx` (home link + auth button) shared by `/` and `/protected`.
- `app/auth/confirm/route.ts`: `next` is now limited to same-origin paths; the template redirected to any URL passed in `?next=` (open redirect).
- `.env.example` lists the four variables the app needs; `.gitignore` ignores `.env*` except `.env.example`.
- Short `README.md` replacing the template one.

## Database

- Supabase Postgres 17, free plan, region `iad1`, provisioned through the Vercel Marketplace.
- No application schema, tables, policies or seed data.
- `db/pre-clock.sql` (applied): event trigger from the Supabase docs that enables RLS on every new table in `public`. Supabase's default privileges give `anon` and `authenticated` full access to new `public` tables through the Data API, so without RLS a new table would be readable and writable with the public key.
- One auth user exists: the candidate's own account, created while checking the sign-up flow.

## Secrets

- `.env.local` (git-ignored, mode 600) holds only the Supabase URL, the publishable key and the two Postgres connection strings.
- The service-role key, secret key and JWT secret are not stored locally; they exist only as server-side Vercel environment variables managed by the integration.
- No secret is referenced from client code; only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` reach the browser.

## Hosting

- Vercel project `renanolovics-projects/interview1`, linked locally (`.vercel/`, git-ignored).
- Supabase environment variables set by the integration for development, preview and production.

## AI tooling

- Claude Code, used for this setup only and for stage 5.
- The Supabase integration installed a local agent skill (`.agents/`, `.claude/`); it is excluded from the repository.

## Verified before the clock

- `tsc --noEmit`, `eslint` and `next build` pass; `pnpm audit --prod` reports no known vulnerabilities.
- Supabase auth and REST endpoints respond 200; direct Postgres connection works.
- Auto-RLS verified by creating a probe table inside a rolled-back transaction.
- Locally, `/`, `/auth/login` and `/auth/sign-up` return 200 and `/protected` redirects to `/auth/login`.
