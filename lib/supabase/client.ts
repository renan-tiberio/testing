import { createBrowserClient } from '@supabase/ssr'

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/lib/env'

import type { SupabaseClient } from '@supabase/supabase-js'

// SupabaseClient's own default database type, until `supabase gen types` output exists.
// The generics are explicit because TypeScript 6 (used by typescript-eslint) infers the
// schema of createBrowserClient as `any`, while TypeScript 7 infers 'public'.
type Database =
  SupabaseClient extends SupabaseClient<infer DefaultDatabase> ? DefaultDatabase : never

export const createClient = (): SupabaseClient<Database, 'public'> =>
  createBrowserClient<Database, 'public'>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
