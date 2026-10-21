import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/lib/env'

import type { NextRequest } from 'next/server'

const PUBLIC_PATH_PREFIXES = ['/login', '/auth']

const isPublicPath = (pathname: string): boolean =>
  pathname === '/' || PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))

export const updateSession = async (request: NextRequest): Promise<NextResponse> => {
  let supabaseResponse = NextResponse.next({ request })

  // One client per request: with Fluid compute, a global client would be shared.
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value)
        }
        supabaseResponse = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) {
          supabaseResponse.cookies.set(name, value, options)
        }
      },
    },
  })

  // Nothing may run between createServerClient and getClaims(): getClaims() refreshes
  // the session cookies, and skipping it logs users out at random.
  const { data } = await supabase.auth.getClaims()

  if (data === null && !isPublicPath(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  // Return supabaseResponse itself: a new response without its cookies would end the
  // browser session.
  return supabaseResponse
}
