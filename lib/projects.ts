// Server-only reads for the project tracker. Queries run as the signed-in user (RLS).
import { createClient } from '@/lib/supabase/server'

export type Project = { id: string; name: string; createdAt: string }

export type AuditEntry = {
  id: string
  action: string
  details: Record<string, unknown>
  createdAt: string
}

export type LoadResult<T> = { ok: true; items: T[] } | { ok: false }

const AUDIT_LIMIT = 5

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const parseProject = ({ row }: { row: unknown }): Project | null => {
  if (!isRecord(row)) return null
  const { id, name, created_at: createdAt } = row
  if (typeof id !== 'string' || typeof name !== 'string' || typeof createdAt !== 'string') {
    return null
  }
  return { id, name, createdAt }
}

const parseAuditEntry = ({ row }: { row: unknown }): AuditEntry | null => {
  if (!isRecord(row)) return null
  const { id, action, details, created_at: createdAt } = row
  if (
    (typeof id !== 'number' && typeof id !== 'string') ||
    typeof action !== 'string' ||
    typeof createdAt !== 'string'
  ) {
    return null
  }
  return { id: String(id), action, details: isRecord(details) ? details : {}, createdAt }
}

export const listProjects = async ({
  tenantId,
}: {
  tenantId: string
}): Promise<LoadResult<Project>> => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
  if (error !== null) {
    console.error('listProjects failed', error)
    return { ok: false }
  }
  const rows: unknown[] = Array.isArray(data) ? data : []
  const items = rows
    .map((row) => parseProject({ row }))
    .filter((project): project is Project => project !== null)
  return { ok: true, items }
}

export const listRecentAudit = async ({
  tenantId,
}: {
  tenantId: string
}): Promise<LoadResult<AuditEntry>> => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('audit_entries')
    .select('id, action, details, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(AUDIT_LIMIT)
  if (error !== null) {
    console.error('listRecentAudit failed', error)
    return { ok: false }
  }
  const rows: unknown[] = Array.isArray(data) ? data : []
  const items = rows
    .map((row) => parseAuditEntry({ row }))
    .filter((entry): entry is AuditEntry => entry !== null)
  return { ok: true, items }
}
