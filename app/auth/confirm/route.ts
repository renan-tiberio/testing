import { redirect } from 'next/navigation'

import { safeNextPath } from '@/lib/safe-next-path'
import { createClient } from '@/lib/supabase/server'

import type { EmailOtpType } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'

const EMAIL_OTP_TYPES: readonly EmailOtpType[] = [
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
  'email',
]

const isEmailOtpType = (value: string | null): value is EmailOtpType =>
  EMAIL_OTP_TYPES.some((type) => type === value)

const errorPath = (message: string): string => `/auth/error?error=${encodeURIComponent(message)}`

export const GET = async (request: NextRequest): Promise<never> => {
  const {
    nextUrl: { searchParams },
  } = request
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  if (tokenHash === null || tokenHash === '' || !isEmailOtpType(type)) {
    redirect(errorPath('No token hash or type'))
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })

  if (error !== null) {
    redirect(errorPath(error.message))
  }

  redirect(safeNextPath(searchParams.get('next')))
}
