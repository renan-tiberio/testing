'use client'

import { useRouter } from 'next/navigation'

import { Button } from '@/components/atoms/button'
import { createClient } from '@/lib/supabase/client'

import type { JSX } from 'react'

export const LogoutButton = (): JSX.Element => {
  const router = useRouter()

  const logout = async (): Promise<void> => {
    await createClient().auth.signOut()
    router.push('/auth/login')
  }

  return (
    <Button
      onClick={() => {
        void logout()
      }}
    >
      Logout
    </Button>
  )
}
