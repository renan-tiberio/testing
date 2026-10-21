-- TenantDesk schema: tenants, memberships, projects, audit entries.
--
-- Authorization lives in two layers:
--   1. Postgres (this file): RLS policies + column-level grants. The Supabase Data API is
--      reachable from any browser with the public key, so the database must enforce
--      tenancy on its own.
--   2. Application (lib/tenancy.ts): server code resolves the user from the session
--      cookie and checks membership/role before touching data, to return clear errors.
--
-- Atomicity: every project INSERT/UPDATE fires an AFTER trigger that writes the audit
-- entry in the same statement, so a project write without its audit row cannot exist,
-- whichever path (app, Data API, SQL) performed it.

create type public.member_role as enum ('viewer', 'editor', 'admin');

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 1 and 80),
  created_at timestamptz not null default now()
);

create table public.memberships (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.member_role not null,
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

create index memberships_user_id_idx on public.memberships (user_id);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null check (name = btrim(name) and char_length(name) between 1 and 80),
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Target of tenant-aware foreign keys: a child row can only point at a project of
  -- its own tenant.
  unique (tenant_id, id)
);

-- Project names are unique per tenant (case-insensitive); the index also serves
-- tenant-scoped lookups.
create unique index projects_tenant_name_key on public.projects (tenant_id, lower(name));
create index projects_tenant_created_at_idx on public.projects (tenant_id, created_at desc);

create table public.audit_entries (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  project_id uuid not null,
  actor_id uuid not null references auth.users (id),
  action text not null check (action in ('project.created', 'project.renamed')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  -- Tenant-aware FK: the audit row's tenant must be the project's tenant.
  foreign key (tenant_id, project_id) references public.projects (tenant_id, id) on delete cascade
);

create index audit_entries_tenant_created_at_idx on public.audit_entries (tenant_id, created_at desc);
create index audit_entries_tenant_project_idx on public.audit_entries (tenant_id, project_id);

-- Membership check used by every policy. SECURITY DEFINER so policies on memberships
-- do not recurse; search_path is empty so every name is schema-qualified.
create function public.has_tenant_role(p_tenant_id uuid, p_roles public.member_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships m
    where m.tenant_id = p_tenant_id
      and m.user_id = (select auth.uid())
      and m.role = any (p_roles)
  );
$$;

revoke execute on function public.has_tenant_role(uuid, public.member_role[]) from public, anon;
grant execute on function public.has_tenant_role(uuid, public.member_role[]) to authenticated;

-- updated_at is server-owned.
create function public.touch_project() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger projects_touch before update on public.projects
for each row execute function public.touch_project();

-- Audit row in the same transaction as the project write. SECURITY DEFINER because
-- users have no INSERT privilege on audit_entries.
create function public.audit_project_write() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_entries (tenant_id, project_id, actor_id, action, details)
    values (new.tenant_id, new.id, coalesce(auth.uid(), new.created_by), 'project.created',
            jsonb_build_object('name', new.name));
  elsif new.name is distinct from old.name then
    insert into public.audit_entries (tenant_id, project_id, actor_id, action, details)
    values (new.tenant_id, new.id, coalesce(auth.uid(), new.created_by), 'project.renamed',
            jsonb_build_object('from', old.name, 'to', new.name));
  end if;
  return null;
end;
$$;

revoke execute on function public.audit_project_write() from public, anon, authenticated;

create trigger projects_audit after insert or update on public.projects
for each row execute function public.audit_project_write();

-- Privileges. Supabase grants ALL on new public tables to anon and authenticated;
-- start from nothing and grant only what the app needs.
revoke all on public.tenants, public.memberships, public.projects, public.audit_entries
  from anon, authenticated;

grant select on public.tenants, public.memberships, public.projects, public.audit_entries
  to authenticated;
-- Only these columns are writable: tenant_id cannot be moved by an UPDATE, created_by
-- comes from auth.uid(), and audit rows are written only by the trigger.
grant insert (tenant_id, name) on public.projects to authenticated;
grant update (name) on public.projects to authenticated;

-- RLS (already enabled by the ensure_rls event trigger; repeated for clarity).
alter table public.tenants enable row level security;
alter table public.memberships enable row level security;
alter table public.projects enable row level security;
alter table public.audit_entries enable row level security;

create policy tenants_select_member on public.tenants
  for select to authenticated
  using (public.has_tenant_role(id, '{viewer,editor,admin}'));

create policy memberships_select_own on public.memberships
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy projects_select_member on public.projects
  for select to authenticated
  using (public.has_tenant_role(tenant_id, '{viewer,editor,admin}'));

create policy projects_insert_writer on public.projects
  for insert to authenticated
  with check (
    public.has_tenant_role(tenant_id, '{editor,admin}')
    and created_by = (select auth.uid())
  );

create policy projects_update_writer on public.projects
  for update to authenticated
  using (public.has_tenant_role(tenant_id, '{editor,admin}'))
  with check (public.has_tenant_role(tenant_id, '{editor,admin}'));

create policy audit_entries_select_member on public.audit_entries
  for select to authenticated
  using (public.has_tenant_role(tenant_id, '{viewer,editor,admin}'));
