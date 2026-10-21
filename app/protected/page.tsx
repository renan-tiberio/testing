import { Suspense } from 'react'

import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

import type { JSX } from 'react'

const SignedInAs = async (): Promise<JSX.Element> => {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()

  if (error !== null || data === null) {
    redirect('/auth/login')
  }

  return <p>Signed in as {data.claims.email}</p>
}

const ProtectedPage = (): JSX.Element => (
  <Suspense>
    <SignedInAs />
  </Suspense>
)

export default ProtectedPage
