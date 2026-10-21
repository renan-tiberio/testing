import Link from 'next/link'

import { cn } from '@/lib/utils'

import type { Membership } from '@/lib/tenancy'
import type { JSX } from 'react'

export const TenantSwitcher = ({
  memberships,
  activeTenantId,
}: {
  memberships: Membership[]
  activeTenantId: string | null
}): JSX.Element => {
  const [first] = memberships
  if (first === undefined) {
    return <p className="text-sm text-muted-foreground">You are not a member of any tenant yet.</p>
  }
  return (
    <nav aria-label="Tenants">
      <ul className="flex flex-wrap gap-2">
        {memberships.map((membership) => {
          const isActive = membership.tenantId === activeTenantId
          return (
            <li key={membership.tenantId}>
              <Link
                href={`/protected?tenant=${encodeURIComponent(membership.tenantId)}`}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm',
                  isActive
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'hover:bg-accent',
                )}
              >
                {membership.tenantName}
                <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                  {membership.role}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
