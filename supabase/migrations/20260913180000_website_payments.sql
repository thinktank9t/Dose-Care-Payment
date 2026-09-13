-- Website payments: manual bKash subscriptions bought on the Dose Care Premium
-- website (dose-care-premium). Builds on 20260913000000_premium_plan.sql.
--
-- Design notes
-- * The website is the only place Premium is bought. It signs users in with
--   Google through this project's Supabase Auth, so `auth.uid()` on the site is
--   the same id the app stores in `users.google_id`.
-- * A payment is a user-submitted bKash Transaction ID (TrxID). An admin checks
--   it against the bKash statement and calls `verify_payment()` (service role,
--   server-side), which activates Premium through `activate_premium()`.
-- * Plan columns on `users` are read-only for `anon` / `authenticated` — a
--   trigger refuses the change. Only the server (service role), the security
--   definer functions below, and pg_cron can write them.
-- * Expiry keeps `premium_until`: it is the user's premium history. Null means
--   never subscribed; a past value renders as "Premium ended <date>".
--
-- Not done here on purpose
-- * `users` row-level security is NOT enabled by this migration. The app still
--   reads/writes `users` without a Supabase session for anonymous users, so
--   turning RLS on would lock them out. `users_select_own` is created so it is
--   in place the day RLS is enabled; it is inert until then.

begin;

-- payments -------------------------------------------------------------------

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  provider text not null default 'bkash',
  trx_id text not null,
  sender_number text,
  plan_period text not null,
  amount_bdt numeric(10, 2),
  status text not null default 'pending',
  note text,
  verified_by text,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.payments
  drop constraint if exists payments_trx_id_key,
  add constraint payments_trx_id_key unique (trx_id);

alter table public.payments
  drop constraint if exists payments_trx_id_format_check,
  add constraint payments_trx_id_format_check
    check (trx_id ~ '^[A-Z0-9]{10}$');

alter table public.payments
  drop constraint if exists payments_plan_period_check,
  add constraint payments_plan_period_check
    check (plan_period in ('monthly', 'yearly'));

alter table public.payments
  drop constraint if exists payments_status_check,
  add constraint payments_status_check
    check (status in ('pending', 'verified', 'rejected'));

alter table public.payments
  drop constraint if exists payments_amount_bdt_check,
  add constraint payments_amount_bdt_check
    check (amount_bdt is null or amount_bdt > 0);

alter table public.payments
  drop constraint if exists payments_sender_number_check,
  add constraint payments_sender_number_check
    check (sender_number is null or sender_number ~ '^01[0-9]{9}$');

create index if not exists payments_user_id_created_at_idx
  on public.payments (user_id, created_at desc);

create index if not exists payments_status_created_at_idx
  on public.payments (status, created_at desc);

comment on table public.payments is
  'bKash TrxIDs submitted on the Premium website. pending -> verified (activates Premium) | rejected. Admin-only writes go through verify_payment()/reject_payment() with the service role.';
comment on column public.payments.trx_id is
  'bKash Transaction ID as printed in the bKash app: 10 uppercase alphanumerics. Normalised (trimmed, upper-cased) on insert; unique across all users.';
comment on column public.payments.verified_by is
  'Email of the admin (admin_users) who verified or rejected the payment.';

-- Normalise and rate-limit submissions. Runs for every insert, including the
-- website's server-side insert, so the rules hold regardless of the caller.
create or replace function public.payments_before_insert()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_pending int;
  v_max_pending constant int := 5;
begin
  new.trx_id := upper(btrim(new.trx_id));
  new.sender_number := nullif(btrim(coalesce(new.sender_number, '')), '');
  new.provider := coalesce(new.provider, 'bkash');

  -- A submission always starts pending; only the admin functions move it on.
  new.status := 'pending';
  new.note := null;
  new.verified_by := null;
  new.verified_at := null;

  select count(*) into v_pending
  from public.payments
  where user_id = new.user_id
    and status = 'pending';

  if v_pending >= v_max_pending then
    raise exception 'PAYMENT_LIMIT:pending'
      using hint = format('At most %s submissions can be pending at once.', v_max_pending);
  end if;

  return new;
end;
$function$;

drop trigger if exists payments_before_insert on public.payments;
create trigger payments_before_insert
  before insert on public.payments
  for each row execute function public.payments_before_insert();

-- admin_users -----------------------------------------------------------------

create table if not exists public.admin_users (
  email text primary key,
  created_at timestamptz not null default now()
);

alter table public.admin_users
  drop constraint if exists admin_users_email_lower_check,
  add constraint admin_users_email_lower_check check (email = lower(btrim(email)));

comment on table public.admin_users is
  'Allow-list for the website admin dashboard (/admin/payments). Matched against the signed-in Google email, lower-cased. Server-side (service role) reads only.';

-- Row-level security --------------------------------------------------------

alter table public.payments enable row level security;
alter table public.admin_users enable row level security;
-- admin_users: no policies on purpose. Only the service role can read it.

drop policy if exists payments_select_own on public.payments;
create policy payments_select_own on public.payments
  for select
  to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.id = payments.user_id
        and u.google_id = auth.uid()::text
    )
  );

drop policy if exists payments_insert_own on public.payments;
create policy payments_insert_own on public.payments
  for insert
  to authenticated
  with check (
    status = 'pending'
    and exists (
      select 1 from public.users u
      where u.id = payments.user_id
        and u.google_id = auth.uid()::text
    )
  );
-- No update/delete policies: clients can never change a submission.

-- users: the policy is inert until RLS is enabled on users (see header).
drop policy if exists users_select_own on public.users;
create policy users_select_own on public.users
  for select
  to authenticated
  using (google_id = auth.uid()::text);

-- Plan columns are server-only ------------------------------------------------
-- PostgREST runs client requests as `anon` / `authenticated`. The service role,
-- pg_cron (postgres) and the security definer functions below run as other
-- roles and pass.

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
     )
  then
    raise exception 'PLAN_READONLY'
      using hint = 'Plan columns are managed by the Premium website server.';
  end if;
  return new;
end;
$function$;

drop trigger if exists users_guard_plan_columns on public.users;
create trigger users_guard_plan_columns
  before update on public.users
  for each row execute function public.guard_users_plan_columns();

-- Activation ------------------------------------------------------------------
-- Stacking: paying while still premium extends from the current end date;
-- paying after a lapse (or for the first time) starts from now.

create or replace function public.activate_premium(p_user_id uuid, p_period text)
returns public.users
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_interval interval;
  v_user public.users;
begin
  v_interval := case p_period
    when 'monthly' then interval '1 month'
    when 'yearly' then interval '1 year'
  end;
  if v_interval is null then
    raise exception 'INVALID_PERIOD:%', p_period;
  end if;

  update public.users
  set plan = 'premium',
      premium_until = greatest(coalesce(premium_until, now()), now()) + v_interval,
      plan_period = p_period,
      plan_source = 'bkash_manual'
  where id = p_user_id
  returning * into v_user;

  if v_user.id is null then
    raise exception 'USER_NOT_FOUND:%', p_user_id;
  end if;

  return v_user;
end;
$function$;

revoke all on function public.activate_premium(uuid, text) from public, anon, authenticated;

-- Admin actions ---------------------------------------------------------------
-- Both are idempotent: they only act on a pending row and return false when
-- there was nothing to do (e.g. a second click).

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
    select 1 from public.admin_users where email = lower(btrim(p_admin_email))
  ) then
    raise exception 'NOT_ADMIN';
  end if;

  update public.payments
  set status = 'verified',
      note = nullif(btrim(coalesce(p_note, '')), ''),
      verified_by = lower(btrim(p_admin_email)),
      verified_at = now()
  where id = p_payment_id
    and status = 'pending'
  returning user_id, plan_period into v_user_id, v_period;

  if v_user_id is null then
    return false;
  end if;

  perform public.activate_premium(v_user_id, v_period);
  return true;
end;
$function$;

create or replace function public.reject_payment(
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
  v_id uuid;
begin
  if not exists (
    select 1 from public.admin_users where email = lower(btrim(p_admin_email))
  ) then
    raise exception 'NOT_ADMIN';
  end if;

  update public.payments
  set status = 'rejected',
      note = nullif(btrim(coalesce(p_note, '')), ''),
      verified_by = lower(btrim(p_admin_email)),
      verified_at = now()
  where id = p_payment_id
    and status = 'pending'
  returning id into v_id;

  return v_id is not null;
end;
$function$;

revoke all on function public.verify_payment(uuid, text, text) from public, anon, authenticated;
revoke all on function public.reject_payment(uuid, text, text) from public, anon, authenticated;

-- Scheduled expiry (hourly) ---------------------------------------------------
-- Downgrades lapsed plans but keeps premium_until (the user's history).
-- `is_premium()` already treats a past premium_until as free, so this job only
-- keeps the `plan` column honest for reporting.

do $$
begin
  begin
    create extension if not exists pg_cron;
  exception when others then
    raise notice 'pg_cron could not be created here (%). Enable it in Dashboard > Database > Extensions, then re-run this migration.', sqlerrm;
  end;

  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'dosecare_expire_premium',
      '0 * * * *',
      $job$
        update public.users
        set plan = 'free'
        where plan = 'premium'
          and premium_until is not null
          and premium_until < now();
      $job$
    );
  else
    raise notice 'pg_cron not installed: skipping dosecare_expire_premium schedule.';
  end if;
end
$$;

commit;
