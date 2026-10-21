// Authorization tests for TenantDesk, run against the real Supabase database.
//
// The browser can call the Supabase Data API directly with the publishable key, so
// Postgres (RLS policies, column grants, CHECK/UNIQUE constraints and the audit trigger)
// is the authorization boundary. Every test signs in a real seeded user with its own
// client and hits that boundary; nothing is mocked.

import { deepEqual, equal, notEqual, ok } from 'node:assert/strict'
import { describe, it } from 'node:test'

import { createClient } from '@supabase/supabase-js'

import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'

const readEnv = (name: string): string => {
  const value: string | undefined = process.env[name]
  if (value === undefined || value === '') {
    throw new Error(`Missing env var ${name}. Run the suite with "pnpm test" (loads .env.local).`)
  }
  return value
}

const SUPABASE_URL = readEnv('NEXT_PUBLIC_SUPABASE_URL')
const SUPABASE_PUBLISHABLE_KEY = readEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
const SEED_USER_PASSWORD = readEnv('SEED_USER_PASSWORD')

const TENANT_A = 'aaaaaaaa-0000-4000-8000-00000000000a'
const TENANT_B = 'bbbbbbbb-0000-4000-8000-00000000000b'
const APOLLO_ID = 'aaaaaaaa-1111-4000-8000-00000000000a'
const APOLLO_NAME = 'Apollo'
const BOREALIS_ID = 'bbbbbbbb-1111-4000-8000-00000000000b'
const BOREALIS_NAME = 'Borealis'
const MAX_NAME_LENGTH = 80
const TOO_LONG_NAME_LENGTH = 81

const PG_INSUFFICIENT_PRIVILEGE = '42501'
const PG_CHECK_VIOLATION = '23514'
const PG_UNIQUE_VIOLATION = '23505'

type ProjectRow = {
  id: string
  tenant_id: string
  name: string
  created_by: string
}

type AuditRow = {
  id: number
  tenant_id: string
  project_id: string
  actor_id: string
  action: string
  details: Record<string, unknown>
}

// SupabaseClient's own default database type, until `supabase gen types` output exists
// (same approach as lib/supabase/client.ts).
type Database =
  SupabaseClient extends SupabaseClient<infer DefaultDatabase> ? DefaultDatabase : never
type Client = SupabaseClient<Database, 'public'>

type SignedInUser = {
  client: Client
  userId: string
}

const PROJECT_COLUMNS = 'id, tenant_id, name, created_by'
const AUDIT_COLUMNS = 'id, tenant_id, project_id, actor_id, action, details'

const newClient = (): Client =>
  createClient<Database, 'public'>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

const signIn = async (email: string): Promise<SignedInUser> => {
  const client = newClient()
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password: SEED_USER_PASSWORD,
  })
  if (error !== null) {
    throw new Error(`Sign-in failed for ${email}: ${error.message}`)
  }
  return { client, userId: data.user.id }
}

const assertPgError = ({ error, code }: { error: PostgrestError | null; code: string }): void => {
  ok(error !== null, `Expected Postgres error ${code}, but the request succeeded.`)
  equal(error.code, code, `Expected ${code}, got ${error.code}: ${error.message}`)
}

const selectProject = async ({
  client,
  id,
}: {
  client: Client
  id: string
}): Promise<ProjectRow[]> => {
  const { data, error } = await client
    .from('projects')
    .select(PROJECT_COLUMNS)
    .eq('id', id)
    .overrideTypes<ProjectRow[], { merge: false }>()
  if (error !== null) {
    throw new Error(`Reading project ${id} failed: ${error.message}`)
  }
  return data
}

const countAuditEntries = async ({
  client,
  tenantId,
}: {
  client: Client
  tenantId: string
}): Promise<number> => {
  const { count, error } = await client
    .from('audit_entries')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
  if (error !== null || count === null) {
    throw new Error(`Counting audit entries failed: ${error?.message ?? 'no count returned'}`)
  }
  return count
}

const alice = await signIn('alice@example.com')
const bob = await signIn('bob@example.com')
const vera = await signIn('vera@example.com')

await describe('1. Unauthenticated (anon) access', async () => {
  const anon = newClient()

  await it('cannot read projects of any tenant', async () => {
    const { data, error } = await anon
      .from('projects')
      .select(PROJECT_COLUMNS)
      .overrideTypes<ProjectRow[], { merge: false }>()
    const names = (data ?? []).map((row) => row.name)
    ok(!names.includes(APOLLO_NAME), 'anon must not see Apollo')
    ok(!names.includes(BOREALIS_NAME), 'anon must not see Borealis')
    assertPgError({ error, code: PG_INSUFFICIENT_PRIVILEGE })
  })

  await it('cannot read audit entries', async () => {
    const { data, error } = await anon.from('audit_entries').select(AUDIT_COLUMNS)
    equal(data, null)
    assertPgError({ error, code: PG_INSUFFICIENT_PRIVILEGE })
  })

  await it('cannot create a project', async () => {
    const { data, error } = await anon
      .from('projects')
      .insert({ tenant_id: TENANT_A, name: `Anon ${Date.now()}` })
      .select(PROJECT_COLUMNS)
    equal(data, null)
    assertPgError({ error, code: PG_INSUFFICIENT_PRIVILEGE })
  })
})

await describe('2. Cross-tenant read', async () => {
  await it("alice cannot read tenant B's project by id", async () => {
    deepEqual(await selectProject({ client: alice.client, id: BOREALIS_ID }), [])
  })

  await it('alice lists only tenant A projects', async () => {
    const { data, error } = await alice.client
      .from('projects')
      .select(PROJECT_COLUMNS)
      .overrideTypes<ProjectRow[], { merge: false }>()
    equal(error, null)
    ok(
      data.every((row) => row.tenant_id === TENANT_A),
      'every visible project belongs to tenant A',
    )
    ok(
      data.some((row) => row.id === APOLLO_ID),
      'alice sees Apollo',
    )
  })

  await it("bob cannot read tenant A's project by id", async () => {
    deepEqual(await selectProject({ client: bob.client, id: APOLLO_ID }), [])
  })

  await it('bob lists only tenant B projects', async () => {
    const { data, error } = await bob.client
      .from('projects')
      .select(PROJECT_COLUMNS)
      .overrideTypes<ProjectRow[], { merge: false }>()
    equal(error, null)
    ok(data.every((row) => row.tenant_id === TENANT_B))
    ok(
      data.some((row) => row.id === BOREALIS_ID),
      'bob sees Borealis',
    )
  })

  await it("alice cannot read tenant B's audit entries", async () => {
    const { data, error } = await alice.client
      .from('audit_entries')
      .select(AUDIT_COLUMNS)
      .eq('tenant_id', TENANT_B)
    equal(error, null)
    deepEqual(data, [])
  })

  await it('alice sees only tenant A audit entries when unfiltered', async () => {
    const { data, error } = await alice.client
      .from('audit_entries')
      .select(AUDIT_COLUMNS)
      .overrideTypes<AuditRow[], { merge: false }>()
    equal(error, null)
    ok(data.every((row) => row.tenant_id === TENANT_A))
  })
})

await describe('3. Cross-tenant write', async () => {
  await it('alice cannot create a project in tenant B', async () => {
    const { data, error } = await alice.client
      .from('projects')
      .insert({ tenant_id: TENANT_B, name: `Intruder ${Date.now()}` })
      .select(PROJECT_COLUMNS)
    equal(data, null)
    assertPgError({ error, code: PG_INSUFFICIENT_PRIVILEGE })
  })

  await it('alice cannot rename Borealis: 0 rows, name unchanged for bob', async () => {
    const { data, error } = await alice.client
      .from('projects')
      .update({ name: `Hijacked ${Date.now()}` })
      .eq('id', BOREALIS_ID)
      .select(PROJECT_COLUMNS)
    equal(error, null)
    deepEqual(data, [])

    const [borealis] = await selectProject({ client: bob.client, id: BOREALIS_ID })
    equal(borealis?.name, BOREALIS_NAME)
  })

  await it('alice cannot move her project to tenant B (tenant_id not updatable)', async () => {
    const { data, error } = await alice.client
      .from('projects')
      .update({ tenant_id: TENANT_B })
      .eq('id', APOLLO_ID)
      .select(PROJECT_COLUMNS)
    equal(data, null)
    assertPgError({ error, code: PG_INSUFFICIENT_PRIVILEGE })

    const [apollo] = await selectProject({ client: alice.client, id: APOLLO_ID })
    equal(apollo?.tenant_id, TENANT_A)
  })
})

await describe('4. Viewer cannot write', async () => {
  await it('vera (viewer of A) can read Apollo', async () => {
    const [apollo] = await selectProject({ client: vera.client, id: APOLLO_ID })
    equal(apollo?.name, APOLLO_NAME)
  })

  await it('vera cannot create a project in tenant A', async () => {
    const { data, error } = await vera.client
      .from('projects')
      .insert({ tenant_id: TENANT_A, name: `Viewer ${Date.now()}` })
      .select(PROJECT_COLUMNS)
    equal(data, null)
    assertPgError({ error, code: PG_INSUFFICIENT_PRIVILEGE })
  })

  await it('vera cannot rename Apollo: 0 rows, name unchanged', async () => {
    const { data, error } = await vera.client
      .from('projects')
      .update({ name: `Viewer rename ${Date.now()}` })
      .eq('id', APOLLO_ID)
      .select(PROJECT_COLUMNS)
    equal(error, null)
    deepEqual(data, [])

    const [apollo] = await selectProject({ client: alice.client, id: APOLLO_ID })
    equal(apollo?.name, APOLLO_NAME)
  })
})

await describe('5. Invalid input is rejected and leaves no audit entry', async () => {
  const invalidCases = [
    { label: 'empty name', name: '', code: PG_CHECK_VIOLATION },
    { label: 'untrimmed name', name: '   padded  ', code: PG_CHECK_VIOLATION },
    {
      label: `name longer than ${MAX_NAME_LENGTH} chars`,
      name: 'x'.repeat(TOO_LONG_NAME_LENGTH),
      code: PG_CHECK_VIOLATION,
    },
    {
      label: 'duplicate name in tenant (case-insensitive)',
      name: APOLLO_NAME.toLowerCase(),
      code: PG_UNIQUE_VIOLATION,
    },
  ]

  await Promise.all(
    invalidCases.map(async (invalid) => {
      await it(`rejects ${invalid.label} with ${invalid.code}`, async () => {
        const auditBefore = await countAuditEntries({ client: alice.client, tenantId: TENANT_A })

        const { data, error } = await alice.client
          .from('projects')
          .insert({ tenant_id: TENANT_A, name: invalid.name })
          .select(PROJECT_COLUMNS)
        equal(data, null)
        assertPgError({ error, code: invalid.code })

        const auditAfter = await countAuditEntries({ client: alice.client, tenantId: TENANT_A })
        equal(auditAfter, auditBefore, 'a failed write must not leave an audit entry')
      })
    }),
  )
})

await describe('6. Authorized write is audited atomically', async () => {
  await it('alice creates then renames a project; each write has exactly one audit row', async () => {
    const createdName = `Test ${Date.now()}`
    const { data: created, error: createError } = await alice.client
      .from('projects')
      .insert({ tenant_id: TENANT_A, name: createdName })
      .select(PROJECT_COLUMNS)
      .single<ProjectRow>()
    equal(createError, null)
    equal(created.tenant_id, TENANT_A)
    equal(created.name, createdName)
    equal(created.created_by, alice.userId)

    const readAudit = async (): Promise<AuditRow[]> => {
      const { data, error } = await alice.client
        .from('audit_entries')
        .select(AUDIT_COLUMNS)
        .eq('project_id', created.id)
        .order('id', { ascending: true })
        .overrideTypes<AuditRow[], { merge: false }>()
      if (error !== null) {
        throw new Error(`Reading audit entries failed: ${error.message}`)
      }
      return data
    }

    const afterCreate = await readAudit()
    deepEqual(
      afterCreate.map((row) => row.action),
      ['project.created'],
    )
    const [createdEntry] = afterCreate
    equal(createdEntry?.action, 'project.created')
    equal(createdEntry.actor_id, alice.userId)
    equal(createdEntry.tenant_id, TENANT_A)
    equal(createdEntry.project_id, created.id)

    const renamedName = `${createdName} renamed`
    const { data: renamed, error: renameError } = await alice.client
      .from('projects')
      .update({ name: renamedName })
      .eq('id', created.id)
      .select(PROJECT_COLUMNS)
      .overrideTypes<ProjectRow[], { merge: false }>()
    equal(renameError, null)
    deepEqual(
      renamed.map((row) => row.name),
      [renamedName],
    )

    const afterRename = await readAudit()
    deepEqual(
      afterRename.map((row) => row.action),
      ['project.created', 'project.renamed'],
    )
    const renameEntry = afterRename.find((row) => row.action === 'project.renamed')
    notEqual(renameEntry, undefined)
    equal(renameEntry?.actor_id, alice.userId)
    equal(renameEntry.tenant_id, TENANT_A)
    deepEqual(renameEntry.details, { from: createdName, to: renamedName })
  })
})
