import { Suspense } from 'react'

import Link from 'next/link'

import { AuthButton } from '@/components/molecules/auth-button'

import type { JSX } from 'react'

export const SiteHeader = (): JSX.Element => (
  <nav className="flex h-16 w-full justify-center border-b border-b-foreground/10">
    <div className="flex w-full max-w-5xl items-center justify-between p-3 px-5 text-sm">
      <Link href="/" className="font-semibold">
        Home
      </Link>
      <Suspense>
        <AuthButton />
      </Suspense>
    </div>
  </nav>
)
