// Server-only: identity and tenant membership resolved from the cookie session.
import { createClient } from '@/lib/supabase/server'

export type MemberRole = 'viewer' | 'editor' | 'admin'

export type Membership = { tenantId: string; tenantName: string; role: MemberRole }

export type CurrentUser = { id: string; email: string | null }

// The requested tenant id comes from the client (query string / form field) and is only
// a request: it resolves to a tenant only when the user holds a membership for it.
export type ActiveTenantResult =
  | { kind: 'active'; membership: Membership; memberships: Membership[] }
  | { kind: 'forbidden'; memberships: Membership[] }
  | { kind: 'none'; memberships: Membership[] }
  | { kind: 'error'; memberships: Membership[] }

const MEMBER_ROLES: readonly MemberRole[] = ['viewer', 'editor', 'admin']

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isMemberRole = (value: unknown): value is MemberRole =>
  MEMBER_ROLES.some((role) => role === value)

export const canWrite = (role: MemberRole): boolean => role === 'editor' || role === 'admin'

export const getCurrentUser = async (): Promise<CurrentUser | null> => {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  if (error !== null || data === null) return null
  const {
    claims: { sub, email },
  } = data
  if (typeof sub !== 'string' || sub === '') return null
  return { id: sub, email: typeof email === 'string' ? email : null }
}

// PostgREST returns a many-to-one embed as an object; accept an array defensively.
const readTenantName = ({ tenants }: { tenants: unknown }): string | null => {
  const [first] = Array.isArray(tenants) ? (tenants as unknown[]) : [tenants]
  const tenant: unknown = first
  if (!isRecord(tenant) || typeof tenant.name !== 'string') return null
  return tenant.name
}

const parseMembership = ({ row }: { row: unknown }): Membership | null => {
  if (!isRecord(row)) return null
  const tenantName = readTenantName({ tenants: row.tenants })
  if (typeof row.tenant_id !== 'string' || !isMemberRole(row.role) || tenantName === null) {
    return null
  }
  return { tenantId: row.tenant_id, tenantName, role: row.role }
}

// Throws when the query fails so callers can show a failure state instead of "no tenants".
export const listMyMemberships = async (): Promise<Membership[]> => {
  const user = await getCurrentUser()
  if (user === null) return []
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('memberships')
    .select('tenant_id, role, tenants(name)')
    .eq('user_id', user.id)
  if (error !== null) throw new Error(`Could not load memberships: ${error.message}`)
  const rows: unknown[] = Array.isArray(data) ? data : []
  return rows
    .map((row) => parseMembership({ row }))
    .filter((membership): membership is Membership => membership !== null)
    .sort((left, right) => left.tenantName.localeCompare(right.tenantName))
}

// Pure decision, separated so it can be unit tested without Supabase.
export const pickActiveTenant = ({
  memberships,
  requestedTenantId,
}: {
  memberships: Membership[]
  requestedTenantId: string | null | undefined
}): ActiveTenantResult => {
  if (requestedTenantId === null || requestedTenantId === undefined || requestedTenantId === '') {
    const [first] = memberships
    return first === undefined
      ? { kind: 'none', memberships }
      : { kind: 'active', membership: first, memberships }
  }
  const match = memberships.find((membership) => membership.tenantId === requestedTenantId)
  return match === undefined
    ? { kind: 'forbidden', memberships }
    : { kind: 'active', membership: match, memberships }
}

export const resolveActiveTenant = async ({
  requestedTenantId,
}: {
  requestedTenantId: string | null | undefined
}): Promise<ActiveTenantResult> => {
  try {
    const memberships = await listMyMemberships()
    return pickActiveTenant({ memberships, requestedTenantId })
  } catch (error: unknown) {
    console.error('resolveActiveTenant failed', error)
    return { kind: 'error', memberships: [] }
  }
}
