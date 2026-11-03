alter table public.profiles
  add column if not exists is_verified boolean not null default false;

update public.profiles p
set is_verified = exists (
  select 1
  from public.verification_requests vr
  where vr.user_id = p.id
    and vr.status = 'approved'
);

create or replace function public.review_verification_request(
  p_request_id uuid,
  p_status text,
  p_admin_notes text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_user_id uuid;
begin
  if auth.uid() is null or not exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  ) then
    raise exception 'Admin access required';
  end if;

  if p_status not in ('approved', 'rejected') then
    raise exception 'Invalid verification status';
  end if;

  update public.verification_requests
  set status = p_status,
      admin_notes = case when p_status = 'rejected' then p_admin_notes else null end,
      updated_at = pg_catalog.now()
  where id = p_request_id
  returning user_id into target_user_id;

  if target_user_id is null then
    raise exception 'Verification request not found';
  end if;

  update public.profiles p
  set is_verified = exists (
    select 1
    from public.verification_requests vr
    where vr.user_id = target_user_id
      and vr.status = 'approved'
  )
  where p.id = target_user_id;
end;
$$;

create or replace function public.admin_set_profile_verified(
  p_user_id uuid,
  p_is_verified boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  ) then
    raise exception 'Admin access required';
  end if;

  update public.profiles
  set is_verified = p_is_verified
  where id = p_user_id;

  if not found then
    raise exception 'Profile not found';
  end if;
end;
$$;

revoke all on function public.review_verification_request(uuid, text, text) from public;
revoke all on function public.admin_set_profile_verified(uuid, boolean) from public;
grant execute on function public.review_verification_request(uuid, text, text) to authenticated;
grant execute on function public.admin_set_profile_verified(uuid, boolean) to authenticated;
