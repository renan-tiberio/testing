import { SiteHeader } from '@/components/organisms/site-header'

import type { JSX, ReactNode } from 'react'

// Site header above a centered content column.
export const MainTemplate = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => (
  <main className="flex min-h-screen flex-col items-center">
    <SiteHeader />
    <div className="w-full max-w-5xl flex-1 p-5">{children}</div>
  </main>
)
