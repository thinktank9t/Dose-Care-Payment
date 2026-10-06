# Dose Care Premium — website

Marketing + account site for the Dose Care mobile app. It is the only place
users buy Premium: sign in with Google, pay manually with bKash, submit the
Transaction ID, an admin verifies it, and the app picks up the plan from the
shared Supabase database on its next resume.

- Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · next-intl (en/bn) · `@supabase/ssr`
- Light theme only, mobile-first (works at 360px), no client-side secrets.

## Routes

| Path | What |
|---|---|
| `/{en,bn}` | Landing: Free vs Premium table, prices, CTA |
| `/{locale}/sign-in` | "Continue with Google" (Supabase Auth, PKCE) |
| `/{locale}/pay` | Choose plan → bKash instructions → submit TrxID (sign-in required) |
| `/{locale}/account` | Profile, plan card (same rules as the app), payment history |
| `/{locale}/admin/payments` | Admin dashboard (email must be in `admin_users`) |
| `/{locale}/privacy`, `/terms`, `/refund-policy` | Legal pages (**TODO: final text**) |
| `/auth/callback` | OAuth return leg (exchanges the code for a session) |

Unprefixed URLs redirect to a locale: the `NEXT_LOCALE` cookie first, then
`Accept-Language`, then `en`.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run dev
```

### Environment variables

| Name | Where | Meaning |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | browser + server | Supabase project URL (shared with the app) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser + server | Publishable/anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | Service-role key. All plan/payment writes use it. Never expose it. |
| `NEXT_PUBLIC_SITE_URL` | build | Public origin, no trailing slash. Used for the OAuth redirect. |
| `NEXT_PUBLIC_BKASH_NUMBER` | build | bKash number users pay to (**TODO**) |
| `NEXT_PUBLIC_BKASH_ACCOUNT_TYPE` | build | `personal` \| `merchant` (**TODO**) |
| `NEXT_PUBLIC_BKASH_METHOD` | build | `send_money` \| `payment` (**TODO**) |
| `NEXT_PUBLIC_PRICE_MONTHLY_BDT`, `NEXT_PUBLIC_PRICE_YEARLY_BDT` | build | BDT prices as integers (**TODO**). `0` = not open yet: the UI shows "Price to be announced" and the server refuses submissions. |
| `E2E_FAKE_BACKEND` | tests only | `1` swaps Supabase for an in-memory backend + fake sign-in. Refused when `VERCEL_ENV=production`. |

### Supabase (one-time)

1. **Run the migration** `supabase/migrations/20260913180000_website_payments.sql`
   against the project (`supabase db push`, or paste into the SQL editor).
   Copy the same file into the app repo's `supabase/migrations/` so both
   projects share one schema history. It is idempotent and safe to re-run.
   It creates `payments`, `admin_users`, the `activate_premium` /
   `verify_payment` / `reject_payment` functions, RLS policies, a trigger that
   makes the plan columns read-only for client roles, and the hourly pg_cron
   expiry job (enable the **pg_cron** extension first: Dashboard → Database →
   Extensions; if it isn't enabled the migration prints a notice and skips the
   schedule — re-run it after enabling).
2. **Enable Google** under Authentication → Providers (same OAuth client the
   app uses is fine). Add `https://<site>/auth/callback` (and
   `http://localhost:3000/auth/callback`) to Authentication → URL
   configuration → Redirect URLs.
3. **Add admins**: `insert into public.admin_users (email) values ('you@example.com');`
   (lower-case).

### How a user maps to the app

After Google sign-in, `auth.uid()` on the site equals what the app stores in
`users.google_id`. The site looks up `users where google_id = auth.uid()`; if
no row exists (the person hasn't used the app with Google yet) it creates one
with `is_anonymous = false` and the Google name/email/avatar. The app adopts
that row on its next Google sign-in, so the purchase is honoured there.

Plan status on `/account` mirrors the app exactly (`src/lib/plan-status.ts`):

- never subscribed → **Free plan**
- `plan = 'premium'` and (`premium_until` null or future) → **Premium** · "Monthly/Yearly · Renews {date}" (or "No expiry")
- `premium_until` in the past (even if `plan = 'free'`) → **Premium ended {date}**

### Payment rules (enforced in the database, mirrored in the UI)

- TrxID: 10 upper-case alphanumerics, trimmed/upper-cased on insert, unique across all users.
- Max 5 pending submissions per user.
- The user id and amount are derived on the server from the session and the plan — the client never sends them.
- Verify/reject are idempotent (only act on a `pending` row) and record `verified_by`, `verified_at`, `note`.
- Verify calls `activate_premium(user, period)`: `premium_until = greatest(coalesce(premium_until, now()), now()) + 1 month|1 year` — paying while still Premium extends from the current end date.
- Hourly job: `update users set plan='free' where plan='premium' and premium_until < now()` — `premium_until` is kept as history.

## Scripts

| Command | What |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` · `npm run typecheck` | ESLint · `tsc --noEmit` |
| `npm run check:messages` | Fails if `messages/en.json` and `messages/bn.json` differ in keys, have empty values, or mismatched ICU placeholders (runs in CI) |
| `npm run test:unit` | Node test runner: plan-status rules, TrxID/phone normalisation, redirect-path guard, formatting |
| `npm run test:e2e` | Playwright smoke tests (mobile 360px + desktop). Builds and starts the site with `E2E_FAKE_BACKEND=1` — no Google or database needed. |

The e2e suite covers: sign-in redirect and return, TrxID submission (auto
upper-case, duplicate refusal), admin verify → `/account` shows Premium with
the correct end date, stacking a second period, non-admin lock-out, language
switch keeping the current page + query, Bangla strings, localised 404.

### The fake backend

`src/lib/data/repo.ts` picks `SupabaseRepo` (production) or `FakeRepo`
(`E2E_FAKE_BACKEND=1`). The fake mirrors the migration's rules in memory and
`/auth/fake?as=user|admin` signs in fixed identities (the "Continue with
Google" button does the same in that mode). The route returns 404 unless the
flag is set, and the flag is ignored on a production Vercel deployment.

## Deploy (Vercel)

Import the repo, set the env vars above (mark `SUPABASE_SERVICE_ROLE_KEY` as
sensitive), set `NEXT_PUBLIC_SITE_URL` to the production origin, and add that
origin's `/auth/callback` to Supabase's redirect URLs. Security headers
(HSTS, nosniff, frame-deny, referrer policy) are set in `next.config.ts`.

## Quality bar

- Lighthouse (mobile, production build, `/en`): Performance 98 · Accessibility 96 · Best practices 100 · SEO 100.
  The one accessibility flag is the section-label colour `--ink-3` (#9A958C on #F6F4EF, ~2.7:1), which is the app's own token; darken it if AA matters more than parity.
- `npm audit` reports a build-time-only postcss advisory pinned inside Next 15; it does not ship to the browser. Bumping to Next 16 clears it.

## Still TODO before launch

- bKash number / account type / method and BDT prices (env vars).
- Support email (env var).
- Final privacy, terms and refund-policy text (`legal.*` in `messages/en.json` and `messages/bn.json`).
- `users` row-level security is **not** enabled by the migration (the app still reads/writes `users` without a session for anonymous users). The `users_select_own` policy is created so it applies the day RLS is switched on.
