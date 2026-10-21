import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/lib/env'

import type { SupabaseClient } from '@supabase/supabase-js'

// One client per call: with Fluid compute, a client kept in a global would be shared
// across requests.
export const createClient = async (): Promise<SupabaseClient> => {
  const cookieStore = await cookies()

  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Server Components cannot set cookies; proxy.ts refreshes the session instead.
        }
      },
    },
  })
}
