-- Website admin allow-list on the production project shared with the mobile app.
-- Does not change users row-level security: the phone app already relies on it.

create table if not exists public.admin_users (
  email text primary key,
  created_at timestamptz not null default now()
);

alter table public.admin_users
  drop constraint if exists admin_users_email_lower_check,
  add constraint admin_users_email_lower_check check (email = lower(btrim(email)));

comment on table public.admin_users is
  'Allow-list for the website admin dashboard. Matched against the signed-in Google email. Service role reads only.';

alter table public.admin_users enable row level security;

insert into public.admin_users (email)
values ('alihaiderakib@gmail.com')
on conflict (email) do nothing;
