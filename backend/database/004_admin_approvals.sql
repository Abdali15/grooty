-- No addresses embedded in code or migrations. Approved addresses are provided by private CLI.
create index if not exists rate_limit_expiry on grooty_private.rate_limits(expires_at);
alter table grooty_commerce.admin_allowlist add column approved_at timestamptz;
alter table grooty_commerce.admin_allowlist add column approval_expires_at timestamptz;
alter table grooty_commerce.admin_allowlist add column approval_actor text;
create function grooty_commerce.bind_approved_identity(target_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare target grooty_commerce.user_identities; permission_id uuid;
begin
 select * into target from grooty_commerce.user_identities where id=target_id;
 if target.id is null or target.verified_at is null then raise exception 'Verified identity required'; end if;
 -- Only explicitly owner-approved PENDING rows can bind; never email supplied by browser.
 update grooty_commerce.admin_allowlist set identity_id=target.id,status='ACTIVE',activated_at=now()
 where provider=target.provider and email=target.email and status='PENDING' and identity_id is null
 and approved_at is not null and approval_expires_at>now() and approval_actor is not null
 and role<>'SUPER_ADMIN' returning id into permission_id;
 if permission_id is not null then
  insert into grooty_private.audit_log(actor,action,entity,detail)
  values(target.profile_id::text,'authorization.bind',permission_id::text,jsonb_build_object('provider',target.provider,'identity_id',target.id));
 end if;
end $$;
revoke all on function grooty_commerce.bind_approved_identity(uuid) from public;
grant execute on function grooty_commerce.bind_approved_identity(uuid) to grooty_app;
