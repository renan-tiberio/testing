# Pre-clock setup

State of this repository before the assessment clock started (2026-10-20).
Everything after the commit containing this file was written during the assessment.

## Framework / auth starter

- Created with `pnpm create next-app --example with-supabase` (official Next.js + Supabase example), unmodified.
- Next.js 16.4.2, React 19.3, TypeScript 5.9, `@supabase/ssr` 0.12.7, `@supabase/supabase-js` 2.118, Tailwind 3, shadcn/ui.
- Included by the template: email/password auth pages (`/auth/login`, `/auth/sign-up`, `/auth/forgot-password`, `/auth/update-password`, `/auth/confirm`), cookie-based session refresh in `proxy.ts`, and a `/protected` route that redirects anonymous users to login.

## Database

- Supabase Postgres 17, free plan, region `iad1`, provisioned through the Vercel Marketplace.
- No schema, tables, policies or seed data created.
- Connection details live in `.env.local` (git-ignored, never committed).

## Hosting

- Vercel project `renanolovics-projects/interview1`, linked locally (`.vercel/`, git-ignored).
- Supabase environment variables set by the integration for development, preview and production.

## AI tooling

- Claude Code, used for this setup only and for stage 5.
- The Supabase integration added an agent skill (`.agents/skills/supabase`, `.claude/skills/supabase`, `skills-lock.json`).

## Changes to the template before the clock

- `.gitignore`: `.env*` appended by the Vercel CLI.
- `pnpm-lock.yaml` from `pnpm install`.
- Agent skill files listed above.
- This file.

## Verified before the clock

- `tsc --noEmit` and `next build` pass.
- Supabase auth and REST endpoints respond 200; direct Postgres connection works.
- Locally, `/`, `/auth/login` and `/auth/sign-up` return 200 and `/protected` redirects to `/auth/login`.
