-- Test data only: two tenants, three users, memberships and one project per tenant.
-- The password comes from the SEED_USER_PASSWORD variable (bound as $1 by
-- scripts/db.mjs); it is never stored in the repository.
-- Runs on every Vercel deploy (`vercel-build`): each statement resets the seeded rows to
-- these canonical values and leaves every other row alone.
--
--   alice@example.com   admin  of Tenant A only
--   bob@example.com     admin  of Tenant B only
--   vera@example.com    viewer of Tenant A only

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
select
  '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
  extensions.crypt($1, extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
  '', '', '', ''
from (values
  ('a11ce000-0000-4000-8000-000000000001'::uuid, 'alice@example.com'),
  ('b0b00000-0000-4000-8000-000000000002'::uuid, 'bob@example.com'),
  ('cccccccc-0000-4000-8000-000000000003'::uuid, 'vera@example.com')
) as u (id, email)
on conflict (id) do update set
  email = excluded.email,
  encrypted_password = excluded.encrypted_password,
  email_confirmed_at = coalesce(auth.users.email_confirmed_at, excluded.email_confirmed_at);

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
select
  gen_random_uuid(), u.id, u.id::text,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email', now(), now(), now()
from auth.users u
where u.id in (
  'a11ce000-0000-4000-8000-000000000001',
  'b0b00000-0000-4000-8000-000000000002',
  'cccccccc-0000-4000-8000-000000000003'
)
on conflict (provider_id, provider) do nothing;

insert into public.tenants (id, name) values
  ('aaaaaaaa-0000-4000-8000-00000000000a', 'Tenant A'),
  ('bbbbbbbb-0000-4000-8000-00000000000b', 'Tenant B')
on conflict (id) do update set name = excluded.name;

insert into public.memberships (tenant_id, user_id, role) values
  ('aaaaaaaa-0000-4000-8000-00000000000a', 'a11ce000-0000-4000-8000-000000000001', 'admin'),
  ('bbbbbbbb-0000-4000-8000-00000000000b', 'b0b00000-0000-4000-8000-000000000002', 'admin'),
  ('aaaaaaaa-0000-4000-8000-00000000000a', 'cccccccc-0000-4000-8000-000000000003', 'viewer')
on conflict (tenant_id, user_id) do update set role = excluded.role;

insert into public.projects (id, tenant_id, name, created_by) values
  ('aaaaaaaa-1111-4000-8000-00000000000a', 'aaaaaaaa-0000-4000-8000-00000000000a',
   'Apollo', 'a11ce000-0000-4000-8000-000000000001'),
  ('bbbbbbbb-1111-4000-8000-00000000000b', 'bbbbbbbb-0000-4000-8000-00000000000b',
   'Borealis', 'b0b00000-0000-4000-8000-000000000002')
on conflict (id) do update set name = excluded.name
-- Skip the reset when another project of the tenant already took the canonical name, so
-- the deploy never fails on the per-tenant unique name.
where not exists (
  select 1 from public.projects p
  where p.tenant_id = excluded.tenant_id
    and lower(p.name) = lower(excluded.name)
    and p.id <> excluded.id
);
