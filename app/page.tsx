import Link from 'next/link'

import { Button } from '@/components/atoms/button'
import { MainTemplate } from '@/components/templates/main-template'

import type { JSX } from 'react'

const Home = (): JSX.Element => (
  <MainTemplate>
    <div className="flex flex-col items-start gap-4">
      <h1 className="text-2xl font-bold">TenantDesk</h1>
      <p className="text-muted-foreground">A tiny multi-tenant project tracker.</p>
      <Button asChild>
        <Link href="/protected">Open your projects</Link>
      </Button>
    </div>
  </MainTemplate>
)

export default Home
