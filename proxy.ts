import { updateSession } from '@/lib/supabase/proxy'

import type { NextRequest, NextResponse } from 'next/server'

export const proxy = async (request: NextRequest): Promise<NextResponse> =>
  await updateSession(request)

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
