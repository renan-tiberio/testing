import { Suspense } from 'react'

import { redirect } from 'next/navigation'
import { connection } from 'next/server'

import { createProject, renameProject } from '@/app/protected/actions'
import { AuditLog } from '@/components/organisms/audit-log'
import { CreateProjectForm } from '@/components/organisms/create-project-form'
import { ProjectList } from '@/components/organisms/project-list'
import { TenantSwitcher } from '@/components/organisms/tenant-switcher'
import { listProjects, listRecentAudit } from '@/lib/projects'
import { canWrite, getCurrentUser, resolveActiveTenant } from '@/lib/tenancy'

import type { Membership } from '@/lib/tenancy'
import type { JSX } from 'react'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

const firstValue = ({ value }: { value: string | string[] | undefined }): string | null => {
  if (!Array.isArray(value)) return value ?? null
  const [first] = value
  return first ?? null
}

const TenantWorkspace = async ({
  membership,
}: {
  membership: Membership
}): Promise<JSX.Element> => {
  const [projects, audit] = await Promise.all([
    listProjects({ tenantId: membership.tenantId }),
    listRecentAudit({ tenantId: membership.tenantId }),
  ])
  const isWriter = canWrite(membership.role)

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold">{membership.tenantName}</h2>
      {isWriter ? (
        <CreateProjectForm tenantId={membership.tenantId} action={createProject} />
      ) : (
        <p role="note" className="rounded-md border bg-muted p-3 text-sm">
          You have read-only access (viewer).
        </p>
      )}
      <section aria-labelledby="projects-heading" className="flex flex-col gap-3">
        <h3 id="projects-heading" className="text-lg font-semibold">
          Projects
        </h3>
        <ProjectList
          tenantId={membership.tenantId}
          projects={projects.ok ? projects.items : null}
          renameAction={isWriter ? renameProject : null}
        />
      </section>
      <section aria-labelledby="audit-heading" className="flex flex-col gap-3">
        <h3 id="audit-heading" className="text-lg font-semibold">
          Recent activity
        </h3>
        <AuditLog entries={audit.ok ? audit.items : null} />
      </section>
    </div>
  )
}

const TenantDesk = async ({
  searchParams,
}: {
  searchParams: SearchParams
}): Promise<JSX.Element> => {
  // The session check reads Date.now() (token expiry); render it at request time only.
  await connection()
  const user = await getCurrentUser()
  if (user === null) redirect('/auth/login')

  const params = await searchParams
  const result = await resolveActiveTenant({
    requestedTenantId: firstValue({ value: params.tenant }),
  })
  const activeMembership = result.kind === 'active' ? result.membership : null

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">TenantDesk</h1>
        <p className="text-sm text-muted-foreground">
          Signed in as {user.email ?? user.id}
          {activeMembership === null ? null : ` · role: ${activeMembership.role}`}
        </p>
      </header>
      {result.kind === 'error' ? (
        <p role="alert" className="text-sm text-red-600">
          Could not load your tenants.
        </p>
      ) : (
        <TenantSwitcher
          memberships={result.memberships}
          activeTenantId={activeMembership?.tenantId ?? null}
        />
      )}
      {result.kind === 'forbidden' ? (
        <p role="alert" className="rounded-md border border-red-300 p-3 text-sm text-red-700">
          You are not a member of this tenant.
        </p>
      ) : null}
      {activeMembership === null ? null : <TenantWorkspace membership={activeMembership} />}
    </div>
  )
}

const ProtectedPage = ({ searchParams }: { searchParams: SearchParams }): JSX.Element => (
  <Suspense fallback={<p>Loading…</p>}>
    <TenantDesk searchParams={searchParams} />
  </Suspense>
)

export default ProtectedPage
