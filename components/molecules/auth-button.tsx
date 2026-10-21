import Link from 'next/link'

import { Button } from '@/components/atoms/button'
import { LogoutButton } from '@/components/atoms/logout-button'
import { createClient } from '@/lib/supabase/server'

import type { JSX } from 'react'

export const AuthButton = async (): Promise<JSX.Element> => {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  if (data === null) {
    return (
      <div className="flex gap-2">
        <Button asChild size="sm" variant="outline">
          <Link href="/auth/login">Sign in</Link>
        </Button>
        <Button asChild size="sm" variant="default">
          <Link href="/auth/sign-up">Sign up</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-4">
      Hey, {data.claims.email}!
      <LogoutButton />
    </div>
  )
}
