-- Run AFTER schema.sql. No account is granted by this migration.
create schema if not exists grooty_private;
revoke all on schema grooty_private from public;
create table if not exists grooty_private.admin_accounts (
  email text primary key check (email = lower(email) and email ~ '^[^[:space:]@]+@gmail\.com$'),
  google_sub text unique,
  role text not null check (role in ('owner','admin')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists grooty_private.sessions (
  token_hash text primary key,
  email text not null references grooty_private.admin_accounts(email),
  csrf text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists session_expiry on grooty_private.sessions(expires_at);
create table if not exists grooty_private.oauth_attempts (
  state_hash text primary key,
  browser_hash text not null,
  verifier text not null,
  nonce text not null,
  expires_at timestamptz not null
);
create table if not exists grooty_private.rate_limits (
  key text primary key,
  count integer not null,
  expires_at timestamptz not null
);
create table if not exists grooty_private.audit_log (
  id bigint generated always as identity primary key,
  actor text not null,
  action text not null,
  entity text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
-- Private tables are inaccessible to frontend roles, including authenticated users.
do $$ begin
  if exists(select 1 from pg_roles where rolname='anon') then
    execute 'revoke all on schema grooty_private from anon';
    execute 'revoke all on all tables in schema grooty_private from anon';
  end if;
  if exists(select 1 from pg_roles where rolname='authenticated') then
    execute 'revoke all on schema grooty_private from authenticated';
    execute 'revoke all on all tables in schema grooty_private from authenticated';
  end if;
end $$;
create unique index if not exists brand_name_case on public.brands(lower(name));
create unique index if not exists product_sku_case on public.products(lower(sku));

-- Dedicated backend role, initially NOLOGIN: no password or connection is created.
-- Enable LOGIN privately only when preparing the actual environment.
do $$ begin
  if not exists(select 1 from pg_roles where rolname='grooty_app') then
    create role grooty_app nologin nosuperuser nocreatedb nocreaterole noinherit nobypassrls;
  end if;
end $$;
grant usage on schema public,grooty_private to grooty_app;
grant select,insert,update on public.products,public.brands,public.store_settings to grooty_app;
grant select,insert,delete on public.product_images to grooty_app;
grant select on grooty_private.admin_accounts to grooty_app;
grant update(google_sub) on grooty_private.admin_accounts to grooty_app;
grant select,insert,delete on grooty_private.sessions,grooty_private.oauth_attempts to grooty_app;
grant select,insert,update,delete on grooty_private.rate_limits to grooty_app;
grant insert on grooty_private.audit_log to grooty_app;
grant usage on all sequences in schema grooty_private to grooty_app;
grant usage on sequence public.products_id_seq to grooty_app;
-- Restricted role can access unpublished products only behind the authorized API.
do $$ declare t text; begin
  foreach t in array array['products','brands','product_images','store_settings'] loop
    execute format('drop policy if exists "backend manage" on public.%I',t);
    execute format('create policy "backend manage" on public.%I for all to grooty_app using(true) with check(true)',t);
  end loop;
end $$;
