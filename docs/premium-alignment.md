# Premium: dev/prod alignment

**Dev (`ikqztmmyltuuacjnqmie`) is canonical** — the mobile app runs against it.
Prod-only features are adopted into dev; on any conflict, dev's version wins.

## Three layers (not two competing designs)

| | A — payment intake | B — manual admin | C — trials |
|---|---|---|---|
| Present in | **both** | **prod only** | **dev only** |
| Tables | `transactions`, `plans`, `pending_claims`, `subscriptions` | `payments`, `admin_users` | `user_entitlements` |
| Key functions | `claim_premium`, `get_premium_status`, `_activate_premium`, `resolve_pending_claim`, `is_premium`, `plan_limit` | `activate_premium`, `verify_payment`, `reject_payment`, `guard_users_plan_columns` | `grant_premium`, `revoke_premium`, `entitlement_state`, `my_entitlement`, `sweep_expired_premium`, `start_trial_for_new_user` |
| Web code | `ClaimPremiumForm.tsx`, `premium-status.ts` | `data/supabase-repo.ts` | not used yet |

`users.plan` and `users.premium_until` are the premium source of truth in all
three. Layer C adds only the 14-day trial window and a payment audit
reference; `entitlement_state()` reads the same two columns.

Every function present in both projects has an identical body (md5-compared).
The divergence is purely the extra objects on each side.

## Migrations in this repo

| File | Owns | Goes to |
|---|---|---|
| `20260913180000_website_payments.sql` | Layer B | **dev** (prod already has it) |
| `20261108040000_website_admin_users.sql` | Layer B | **dev** |
| `20261121090000_premium_entitlements.sql` | Layer C | **prod** (dev already has it) |
| `20261121091000_premium_caregiver_limits.sql` | Layer C | **prod** |
| `20261127000000_align_premium_writers.sql` | reconciliation | both |

The two Layer C files were captured from dev's live DDL — they had been applied
there but never committed anywhere. They are **app-owned**, so they belong in
the mobile app repo long-term; they sit here only to carry the schema to prod.

## What the reconciliation changes

- `grant_premium` becomes the single writer of `users.plan` / `premium_until`,
  and now also maintains `plan_period`, `plan_source` and `premium_since` —
  `get_premium_status()` reports all three but `grant_premium` never set them.
  Signature unchanged, so existing app callers keep working.
- `verify_payment` calls `grant_premium` instead of `activate_premium`, so
  buying during a trial no longer burns trial days and paid periods end at
  00:00 Dhaka (dev's rules win over calendar months).
- `activate_premium` is dropped.
- `guard_users_plan_columns` is adopted into dev. Both projects grant `anon`
  and `authenticated` UPDATE on the plan columns with a `users_update_own`
  policy of `USING (true)`, so dev currently lets a client grant itself
  premium. The guard fires only on an actual change, so unchanged full-row
  upserts still pass.

Not changed: `_activate_premium` (Layer A) still writes `users.plan` directly,
bypassing trial rules. Folding it into `grant_premium` is a follow-up.

## Status: applied 2026-11-27

Both projects were aligned via the Supabase Management API (read/write SQL),
not the CLI, because no DB password was available. Migration history in both
projects was rewritten to match this repo's filenames so `supabase db push`
and `supabase db diff` behave correctly from here on.

Verified identical across both projects: tables (18), columns (195),
functions (36, **byte-identical bodies**), triggers (13), event triggers (7),
policies (33), indexes (48), RLS flags (17), cron jobs (2), and the full
40-entry migration history.

### What was applied where

| Migration | dev | prod |
|---|---|---|
| `20260913180000_website_payments` | applied | already present |
| `20261108040000_website_admin_users` | applied | already present |
| `20261121090000_premium_entitlements` | already present | applied (6 trial rows backfilled) |
| `20261121091000_premium_caregiver_limits` | already present | applied |
| `20261127000000_align_premium_writers` | applied | applied |
| `20261127001000_adopt_rls_auto_enable` | applied | already present |

Also: prod's hourly `dosecare_expire_premium` cron was retired in favour of
dev's daily `sweep-expired-premium`, and two prod function bodies
(`reject_payment`, `payments_before_insert`) were reformatted to match the
repo's text — same logic, but otherwise they would show in every future diff.

### Functional verification

Run against both projects inside a transaction that was then aborted, so no
data changed (confirmed afterwards: dev 34 users / 0 premium, prod 6 / 0):

| Check | dev | prod |
|---|---|---|
| `entitlement_state` before | `free` | `trial` |
| `grant_premium` -> plan | `premium` | `premium` |
| period lands on 00:00 Dhaka | yes | yes |
| trial days not burned | n/a (trial expired) | **yes** - premium ran from trial end + 30d |
| `plan_period` / `plan_source` set | yes | yes |
| client-side plan write | **blocked** | **blocked** |

### Known remaining difference

`pg_net` is 0.20.0 on dev and 0.20.4 on prod. It is platform-managed: dev runs
Postgres 17.6.1.113 and prod 17.11.0.003, and 0.20.4 is not offered on dev's
image. Only a Postgres upgrade of the dev project closes it. Not schema drift.

## Original runbook (for future migrations)


Order matters — each step assumes the previous one.

```bash
supabase init                      # no config.toml exists yet
```

**1. Fix the medicine_catalog version collision.** The same migration is
recorded under two stamps: prod `20261108000000`, dev `20261108113339`.
Dev wins, so repair prod's history:

```bash
supabase link --project-ref zonvummielhetzcyootb
supabase migration repair --status reverted 20261108000000
supabase migration repair --status applied  20261108113339
```

**2. Mark already-applied migrations so push does not re-run them.**
Prod has Layer B under three stamps (`20261107215841`, `20261107215923`,
`20261107215936`) that do not match this repo's filenames; dev has Layer C.

```bash
# prod: Layer B already present
supabase migration repair --status applied 20260913180000 20261108040000
# dev: Layer C already present
supabase link --project-ref ikqztmmyltuuacjnqmie
supabase migration repair --status applied 20261121090000 20261121091000
```

**3. Dev first — adopt Layer B.** Enable `pg_cron` in the dashboard first.

```bash
supabase db diff --linked          # expect only Layer B + reconciliation
supabase db push
npm run which-db                   # confirm dev
npm run test:unit && npm run test:e2e && npm run build
```

Then smoke-test the **mobile app** against dev — the `users_guard_plan_columns`
trigger is new there and will reject any client-side plan-column change.

**4. Prod last.** Take an on-demand backup first (Dashboard → Database →
Backups) and enable `pg_cron`.

```bash
supabase link --project-ref zonvummielhetzcyootb
supabase db diff --linked          # expect only Layer C + reconciliation
supabase db push
```

Prod holds 0 `payments` rows and 0 premium users, so there is nothing to
backfill. `premium_entitlements` backfills trial rows for existing users.

**5. Verify parity.**

```bash
supabase db diff --linked          # empty on both
```
