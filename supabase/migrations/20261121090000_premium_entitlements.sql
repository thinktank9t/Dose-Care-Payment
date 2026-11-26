-- premium_entitlements
--
-- Trial layer + the single premium read API. Captured from the Dev project
-- (ikqztmmyltuuacjnqmie), where it was applied as 20261121090000 without ever
-- being committed. Prod does not have it yet.
--
-- `users.plan` / `users.premium_until` remain the premium source of truth;
-- this adds the 14-day trial, Dhaka-midnight period boundaries, and the
-- limits the app reads. Idempotent.

create table if not exists public.user_entitlements (
  user_id uuid not null references public.users (id) on delete cascade,
  trial_started_at timestamptz not null default now(),
  trial_ends_at timestamptz not null,
  last_payment_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_entitlements_pkey primary key (user_id)
);

comment on table public.user_entitlements is
  'Per-user trial window and payment audit reference. Premium access itself is read from users.plan / users.premium_until.';

alter table public.user_entitlements enable row level security;

CREATE OR REPLACE FUNCTION public.dhaka_day_start_after(p_from timestamp with time zone, p_days integer)
 RETURNS timestamp with time zone
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select (
    date_trunc('day', p_from at time zone 'Asia/Dhaka')
      + make_interval(days => p_days)
  ) at time zone 'Asia/Dhaka';
$function$;

CREATE OR REPLACE FUNCTION public.entitlement_state(p_user_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select case
    -- Premium comes from the payment flow's own columns.
    when u.plan = 'premium'
         and u.premium_until is not null
         and u.premium_until > now()
      then 'premium'
    -- Trial is this feature's own record.
    when e.trial_ends_at is not null and e.trial_ends_at > now()
      then 'trial'
    else 'free'
  end
  from (select p_user_id as id) q
  left join public.users u on u.id = q.id
  left join public.user_entitlements e on e.user_id = q.id;
$function$;

CREATE OR REPLACE FUNCTION public.my_entitlement(p_user_id uuid)
 RETURNS TABLE(state text, trial_ends_at timestamp with time zone, plan text, premium_ends_at timestamp with time zone, caregiver_limit integer, prescription_limit integer, server_time timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    public.entitlement_state(p_user_id) as state,
    e.trial_ends_at,
    -- Reported straight from the payment flow's columns, so the app and the
    -- payment system can never disagree.
    nullif(u.plan, 'free') as plan,
    u.premium_until as premium_ends_at,
    case public.entitlement_state(p_user_id)
      when 'free' then 0
      else 1
    end as caregiver_limit,
    case public.entitlement_state(p_user_id)
      when 'premium' then 5
      else 0
    end as prescription_limit,
    now() as server_time
  from (select p_user_id as id) q
  left join public.users u on u.id = q.id
  left join public.user_entitlements e on e.user_id = q.id;
$function$;

CREATE OR REPLACE FUNCTION public.grant_premium(p_user_id uuid, p_plan text, p_payment_reference text DEFAULT NULL::text)
 RETURNS users
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user public.users;
  v_days integer;
  v_trial_ends timestamptz;
  v_starts_at timestamptz;
begin
  if p_plan not in ('monthly', 'yearly') then
    raise exception 'Unknown plan %', p_plan using errcode = 'check_violation';
  end if;

  -- FR-21: fixed lengths, not calendar months.
  v_days := case p_plan when 'monthly' then 30 else 365 end;

  select * into v_user
  from public.users
  where id = p_user_id
  for update;

  if v_user.id is null then
    raise exception 'No user %', p_user_id using errcode = 'no_data_found';
  end if;

  select e.trial_ends_at into v_trial_ends
  from public.user_entitlements e
  where e.user_id = p_user_id;

  -- A3: buying during the trial does not burn trial days. Renewing extends
  -- from the current end, so periods never overlap (CC-24, CC-25).
  v_starts_at := greatest(
    now(),
    coalesce(v_trial_ends, now()),
    coalesce(v_user.premium_until, now())
  );

  update public.users
  set plan = 'premium',
      -- CC-07 / Q-04: paid periods end at 00:00 Dhaka, like the trial.
      premium_until = public.dhaka_day_start_after(v_starts_at, v_days)
  where id = p_user_id
  returning * into v_user;

  -- Audit only; never read for access decisions.
  update public.user_entitlements
  set last_payment_reference = coalesce(
        p_payment_reference,
        last_payment_reference
      )
  where user_id = p_user_id;

  return v_user;
end;
$function$;

CREATE OR REPLACE FUNCTION public.revoke_premium(p_user_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS users
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user public.users;
begin
  update public.users
  set plan = 'free',
      premium_until = null
  where id = p_user_id
  returning * into v_user;

  update public.user_entitlements
  set last_payment_reference = coalesce(p_reason, last_payment_reference)
  where user_id = p_user_id;

  return v_user;
end;
$function$;

CREATE OR REPLACE FUNCTION public.sweep_expired_premium()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_count integer;
begin
  update public.users
  set plan = 'free'
  where plan = 'premium'
    and premium_until is not null
    -- Strictly in the past. A plan ending at exactly now() is already Free by
    -- entitlement_state()'s `premium_until > now()`, and the next run catches
    -- it; never round in the direction that removes access early.
    and premium_until < now();

  get diagnostics v_count = row_count;

  if v_count > 0 then
    raise log 'sweep_expired_premium: % user(s) moved to free', v_count;
  end if;

  return v_count;
end;
$function$;

CREATE OR REPLACE FUNCTION public.start_trial_for_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.user_entitlements (
    user_id,
    trial_started_at,
    trial_ends_at
  )
  values (
    new.id,
    now(),
    public.dhaka_day_start_after(now(), 14)
  )
  on conflict (user_id) do nothing;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.guard_entitlement_update()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if new.trial_started_at <> old.trial_started_at
     or new.trial_ends_at <> old.trial_ends_at then
    raise exception 'The trial window cannot be changed once set'
      using errcode = 'check_violation';
  end if;

  new.updated_at = now();
  return new;
end;
$function$;


drop trigger if exists user_entitlements_guard_update on public.user_entitlements;
CREATE TRIGGER user_entitlements_guard_update BEFORE UPDATE ON public.user_entitlements FOR EACH ROW EXECUTE FUNCTION guard_entitlement_update();

drop trigger if exists users_start_trial on public.users;
CREATE TRIGGER users_start_trial AFTER INSERT ON public.users FOR EACH ROW EXECUTE FUNCTION start_trial_for_new_user();

drop policy if exists user_entitlements_select on public.user_entitlements;
create policy user_entitlements_select on public.user_entitlements
  for select using (true);

-- Read API is callable by clients; writers are server-side only.
grant execute on function public.entitlement_state(uuid) to anon, authenticated;
grant execute on function public.my_entitlement(uuid) to anon, authenticated;
revoke all on function public.grant_premium(uuid, text, text) from public, anon, authenticated;
revoke all on function public.revoke_premium(uuid, text) from public, anon, authenticated;
revoke all on function public.sweep_expired_premium() from public, anon, authenticated;

-- Daily expiry sweep (00:05 Dhaka = 18:05 UTC). Needs pg_cron enabled.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('sweep-expired-premium')
      where exists (select 1 from cron.job where jobname = 'sweep-expired-premium');
    perform cron.schedule('sweep-expired-premium', '5 18 * * *',
      $cron$ select public.sweep_expired_premium(); $cron$);
  else
    raise notice 'pg_cron not enabled - skipping sweep-expired-premium. Enable it and re-run.';
  end if;
end
$$;

-- Backfill trials for users created before this migration.
insert into public.user_entitlements (user_id, trial_started_at, trial_ends_at)
select u.id, now(), public.dhaka_day_start_after(now(), 14)
from public.users u
on conflict (user_id) do nothing;
