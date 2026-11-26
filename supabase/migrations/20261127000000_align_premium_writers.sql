-- align_premium_writers
--
-- Dev is canonical (the mobile app runs against it), so dev's grant_premium
-- becomes the single writer of users.plan / premium_until, and prod's
-- activate_premium is retired. Prod's guard trigger is adopted into dev,
-- where plan columns are currently unprotected.
--
-- Requires: website_payments + website_admin_users (prod's Layer B, pushed to
-- dev) AND premium_entitlements (dev's Layer C, pushed to prod). Idempotent.

-- 1. Single premium writer. Extended to maintain plan_period, plan_source and
--    premium_since, which get_premium_status() reports but grant_premium did
--    not set. Signature unchanged so existing app callers keep working.
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
      premium_until = public.dhaka_day_start_after(v_starts_at, v_days),
      -- Added during dev/prod alignment: get_premium_status() reports these
      -- three, so the single premium writer has to maintain them or they go
      -- stale. plan_source is 'bkash_manual' because that is the only route
      -- today; add a parameter (with a default, to stay callable by the app)
      -- when a second source appears.
      plan_period = p_plan,
      plan_source = 'bkash_manual',
      premium_since = coalesce(premium_since, now())
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

-- 2. Admin verification now activates through grant_premium, so a purchase
--    during a trial no longer burns trial days and paid periods end at 00:00
--    Dhaka (grant_premium's rules win over activate_premium's calendar months).
create or replace function public.verify_payment(
  p_payment_id uuid,
  p_admin_email text,
  p_note text default null
)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user_id uuid;
  v_period text;
begin
  if not exists (
    select 1 from public.admin_users
    where email = lower(btrim(p_admin_email))
  ) then
    raise exception 'NOT_ADMIN';
  end if;

  update public.payments
  set status = 'verified',
      note = nullif(btrim(coalesce(p_note, '')), ''),
      verified_by = lower(btrim(p_admin_email)),
      verified_at = now()
  where id = p_payment_id and status = 'pending'
  returning user_id, plan_period into v_user_id, v_period;

  if v_user_id is null then
    return false;
  end if;

  -- Was activate_premium(v_user_id, v_period).
  perform public.grant_premium(v_user_id, v_period, 'payment:' || p_payment_id);
  return true;
end;
$function$;

revoke all on function public.verify_payment(uuid, text, text)
  from public, anon, authenticated;

-- 3. Retire the superseded writer.
drop function if exists public.activate_premium(uuid, text);

-- 4. Adopt prod's plan-column guard into dev. Both projects grant anon and
--    authenticated UPDATE on users.plan/premium_until/plan_period/plan_source
--    and carry a users_update_own policy of USING (true), so without this a
--    client can grant itself premium. The guard only raises when a plan value
--    actually changes, so a full-row upsert of unchanged values still passes,
--    and grant_premium is security definer so it is unaffected.
create or replace function public.guard_users_plan_columns()
returns trigger
language plpgsql
as $function$
begin
  if current_user in ('anon', 'authenticated')
     and (
       new.plan is distinct from old.plan
       or new.premium_until is distinct from old.premium_until
       or new.plan_period is distinct from old.plan_period
       or new.plan_source is distinct from old.plan_source
       or new.premium_since is distinct from old.premium_since
     )
  then
    raise exception 'PLAN_READONLY'
      using hint = 'Plan columns are managed by the server (grant_premium).';
  end if;
  return new;
end;
$function$;

drop trigger if exists users_guard_plan_columns on public.users;
create trigger users_guard_plan_columns
  before update on public.users
  for each row execute function public.guard_users_plan_columns();

-- 5. One expiry job across both projects. website_payments.sql schedules an
--    hourly `dosecare_expire_premium` doing the same downgrade as dev's
--    `sweep-expired-premium` (daily, 00:05 Dhaka). Dev wins, so retire the
--    duplicate rather than run both on different cadences.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('dosecare_expire_premium')
      where exists (select 1 from cron.job where jobname = 'dosecare_expire_premium');
  end if;
end
$$;
