-- Additive migration for the V4 English schema ONLY. Never apply to productos.
do $$ begin
 if to_regclass('public.products') is null or to_regclass('grooty_private.admin_accounts') is null then
   raise exception 'Wrong schema: review branch compatibility before migration';
 end if;
end $$;
create schema if not exists grooty_commerce;
revoke all on schema grooty_commerce from public,anon,authenticated;
create table grooty_commerce.profiles (
 id uuid primary key default gen_random_uuid(), display_name text not null default '' check(length(display_name)<=120),
 created_at timestamptz not null default now(), deletion_requested_at timestamptz
);
create table grooty_commerce.user_identities (
 id uuid primary key default gen_random_uuid(), profile_id uuid not null references grooty_commerce.profiles,
 provider text not null check(provider in ('google','microsoft')), issuer text not null,
 subject text not null check(length(subject) between 1 and 255), email text not null check(email=lower(email)),
 verified_at timestamptz not null, unique(provider,issuer,subject)
 -- Email is intentionally NOT unique: never merge accounts across providers by email.
);
create table grooty_commerce.admin_allowlist (
 id uuid primary key default gen_random_uuid(), email text not null check(email=lower(email)),
 provider text not null check(provider in ('google','microsoft')), identity_id uuid references grooty_commerce.user_identities,
 role text not null check(role in ('CATALOG_MANAGER','ORDER_MANAGER','ADMIN','SUPER_ADMIN')),
 status text not null default 'PENDING' check(status in ('PENDING','ACTIVE','REVOKED')),
 created_at timestamptz not null default now(), activated_at timestamptz,
 granted_by uuid references grooty_commerce.profiles, revoked_at timestamptz,
 check(status<>'ACTIVE' or (identity_id is not null and activated_at is not null)),
 unique(provider,email), unique(identity_id)
);
-- No accounts or candidate emails are inserted. Activation requires explicit owner authorization.
create table grooty_commerce.sessions (
 token_hash text primary key, identity_id uuid not null references grooty_commerce.user_identities,
 csrf text not null, expires_at timestamptz not null, mfa_at timestamptz, reauthenticated_at timestamptz,
 created_at timestamptz not null default now()
);
create index commerce_session_expiry on grooty_commerce.sessions(expires_at);
create table grooty_commerce.oauth_attempts (
 state_hash text primary key, browser_hash text not null, provider text not null check(provider in ('google','microsoft')),
 verifier text not null, nonce text not null, expires_at timestamptz not null
);
create table grooty_commerce.mfa_credentials (
 identity_id uuid primary key references grooty_commerce.user_identities,
 encrypted_secret text not null, confirmed_at timestamptz, last_counter bigint not null default -1
);
create table grooty_commerce.orders (
 id uuid primary key default gen_random_uuid(), profile_id uuid not null references grooty_commerce.profiles,
 status text not null default 'CREATED' check(status in ('CREATED','PENDING_PAYMENT','PAID','PROCESSING','SHIPPED','DELIVERED','PAYMENT_FAILED','PAYMENT_EXPIRED','CANCELLED','REFUND_PENDING','PARTIALLY_REFUNDED','REFUNDED','CHARGEBACK')),
 total_cents bigint not null check(total_cents>0 and total_cents<=9999999999), currency text not null default 'PEN' check(currency='PEN'),
 idempotency_key text not null, request_hash text not null, address jsonb not null check(jsonb_typeof(address)='object'),
 expires_at timestamptz not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(profile_id,idempotency_key)
);
create table grooty_commerce.order_items (
 order_id uuid not null references grooty_commerce.orders, product_id bigint not null references public.products,
 title text not null, quantity integer not null check(quantity between 1 and 20), unit_cents bigint not null check(unit_cents>0),
 primary key(order_id,product_id)
);
create table grooty_commerce.inventory_reservations (
 order_id uuid not null references grooty_commerce.orders, product_id bigint not null references public.products,
 quantity integer not null check(quantity>0), expires_at timestamptz not null,
 status text not null default 'HELD' check(status in ('HELD','CONSUMED','RELEASED')),
 primary key(order_id,product_id)
);
create index active_inventory_holds on grooty_commerce.inventory_reservations(product_id,expires_at) where status='HELD';
create table grooty_commerce.inventory_movements (
 id bigint generated always as identity primary key, product_id bigint not null references public.products,
 order_id uuid references grooty_commerce.orders, delta integer not null, reason text not null,
 actor uuid references grooty_commerce.profiles, created_at timestamptz not null default now(),
 unique(order_id,product_id,reason)
);
create table grooty_commerce.payments (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references grooty_commerce.orders,
 provider text not null, environment text not null check(environment in ('sandbox','production','mock')),
 provider_id text, preference_id text, status text not null default 'pending', amount_cents bigint not null check(amount_cents>0),
 refunded_cents bigint not null default 0 check(refunded_cents>=0 and refunded_cents<=amount_cents),
 updated_at timestamptz not null default now(), unique(provider,environment,provider_id), unique(order_id)
);
create table grooty_commerce.payment_events (
 id bigint generated always as identity primary key, order_id uuid not null references grooty_commerce.orders,
 provider text not null, event_key text not null, from_state text not null, to_state text not null,
 created_at timestamptz not null default now(), unique(provider,event_key)
);
create table grooty_commerce.promotions (
 id uuid primary key default gen_random_uuid(), product_id bigint not null references public.products,
 unit_cents bigint not null check(unit_cents>0), starts_at timestamptz not null, ends_at timestamptz not null,
 active boolean not null default false, check(ends_at>starts_at)
);
create table grooty_commerce.custom_figure_requests (
 id uuid primary key default gen_random_uuid(), profile_id uuid not null references grooty_commerce.profiles,
 details jsonb not null check(jsonb_typeof(details)='object'), status text not null default 'SUBMITTED' check(status in ('SUBMITTED','REVIEWING','QUOTED','ACCEPTED','DECLINED','CANCELLED')),
 quote_cents bigint check(quote_cents>0), quote_expires_at timestamptz, created_at timestamptz not null default now()
);
create table grooty_commerce.preorders (
 id uuid primary key default gen_random_uuid(), profile_id uuid not null references grooty_commerce.profiles,
 product_id bigint not null references public.products, quantity integer not null check(quantity between 1 and 20),
 status text not null default 'RESERVED' check(status in ('RESERVED','AVAILABLE','PAID','EXPIRED','CANCELLED')),
 available_at timestamptz, pay_by timestamptz, token_hash text unique, order_id uuid references grooty_commerce.orders,
 created_at timestamptz not null default now(), check(pay_by is null or pay_by=available_at+interval '7 days')
);
create table grooty_commerce.outbox (
 id uuid primary key default gen_random_uuid(), profile_id uuid references grooty_commerce.profiles,
 kind text not null, resource_id uuid not null, payload jsonb not null default '{}',
 status text not null default 'PENDING' check(status in ('PENDING','SENT','FAILED','DEVELOPMENT')),
 attempts integer not null default 0, created_at timestamptz not null default now(), unique(kind,resource_id)
);
-- All commerce tables are private. Only trusted API role has explicit policies.
do $$ declare t text; begin
 for t in select tablename from pg_tables where schemaname='grooty_commerce' loop
   execute format('alter table grooty_commerce.%I enable row level security',t);
   execute format('create policy api_only on grooty_commerce.%I to grooty_app using(true) with check(true)',t);
 end loop;
end $$;
grant usage on schema grooty_commerce to grooty_app;
grant select,insert,update on all tables in schema grooty_commerce to grooty_app;
revoke insert,update on grooty_commerce.admin_allowlist from grooty_app;
grant delete on grooty_commerce.sessions,grooty_commerce.oauth_attempts to grooty_app;
grant usage on all sequences in schema grooty_commerce to grooty_app;
-- Financial journal is append-only for the API.
revoke update on grooty_commerce.payment_events,grooty_commerce.inventory_movements from grooty_app;
create function grooty_commerce.guard_super_admin() returns trigger language plpgsql set search_path='' as $$
begin
 if old.status='ACTIVE' and old.role='SUPER_ADMIN' and
   (tg_op='DELETE' or new.status<>'ACTIVE' or new.role<>'SUPER_ADMIN') then
   perform pg_advisory_xact_lock(781349012);
   if not exists(select 1 from grooty_commerce.admin_allowlist where id<>old.id and role='SUPER_ADMIN' and status='ACTIVE') then
     raise exception 'Cannot remove last SUPER_ADMIN';
   end if;
 end if;
 if tg_op='DELETE' then return old; end if; return new;
end $$;
create trigger protect_last_super_admin before update or delete on grooty_commerce.admin_allowlist for each row execute function grooty_commerce.guard_super_admin();
create function grooty_commerce.change_authorization(session_hash text,target_identity uuid,new_role text,new_status text) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid; target grooty_commerce.user_identities;
begin
 perform pg_advisory_xact_lock(781349012);
 select i.profile_id into actor from grooty_commerce.sessions s
 join grooty_commerce.user_identities i on i.id=s.identity_id
 join grooty_commerce.admin_allowlist a on a.identity_id=i.id
 where s.token_hash=session_hash and s.expires_at>now() and s.mfa_at>now()-interval '1 hour'
 and s.reauthenticated_at>now()-interval '5 minutes' and a.status='ACTIVE' and a.role='SUPER_ADMIN';
 if actor is null then raise exception 'Permission denied'; end if;
 if new_role not in ('CATALOG_MANAGER','ORDER_MANAGER','ADMIN','SUPER_ADMIN') or new_status not in ('ACTIVE','REVOKED') then raise exception 'Invalid authorization'; end if;
 select * into target from grooty_commerce.user_identities where id=target_identity;
 if target.id is null then raise exception 'Identity missing'; end if;
 insert into grooty_commerce.admin_allowlist(email,provider,identity_id,role,status,activated_at,granted_by,revoked_at)
 values(target.email,target.provider,target.id,new_role,new_status,now(),actor,case when new_status='REVOKED' then now() end)
 on conflict(provider,email) do update set identity_id=excluded.identity_id,role=excluded.role,status=excluded.status,activated_at=excluded.activated_at,granted_by=actor,revoked_at=excluded.revoked_at;
 delete from grooty_commerce.sessions where identity_id=target_identity;
 insert into grooty_private.audit_log(actor,action,entity,detail) values(actor::text,'authorization.change',target_identity::text,jsonb_build_object('role',new_role,'status',new_status));
end $$;
revoke all on function grooty_commerce.change_authorization(text,uuid,text,text) from public;
grant execute on function grooty_commerce.change_authorization(text,uuid,text,text) to grooty_app;
-- Stock adjustments cannot invalidate other customers' active holds.
create function grooty_commerce.guard_stock() returns trigger language plpgsql set search_path='' as $$
declare held bigint;
begin
 select coalesce(sum(quantity),0) into held from grooty_commerce.inventory_reservations where product_id=new.id and status='HELD' and expires_at>now();
 if held>0 and (new.stock is null or new.stock<held) then raise exception 'Stock reserved'; end if;
 return new;
end $$;
-- Payment consumption first marks its own holds CONSUMED, inside the same transaction.
create trigger protect_inventory_holds before update of stock on public.products for each row execute function grooty_commerce.guard_stock();
