# Environments: Dev and Prod Supabase

Two separate Supabase projects, same org (`qgbhkugafqhhovnrcdvu`), region `ap-south-1`.

| | Project | Ref | Created |
|---|---|---|---|
| **Prod** | Dose-Care-Prod | `zonvummielhetzcyootb` | 2026-10-21 |
| **Dev** | Dose-Care-Dev | `ikqztmmyltuuacjnqmie` | 2026-05-07 |

## Branch -> environment -> project

| Branch | Vercel env | Supabase | `NEXT_PUBLIC_SITE_URL` |
|---|---|---|---|
| `master` | Production | **Prod** `zonvummielhetzcyootb` | `https://www.dose-care.com` |
| `dev`, features | Preview | **Dev** `ikqztmmyltuuacjnqmie` | auto Vercel URL |
| local | — | **Dev** `ikqztmmyltuuacjnqmie` | `http://localhost:3000` |

Env files are gitignored, so the branch never selects the project — **Vercel's
per-environment variables do**. Scope every Supabase var to a single
environment; a var scoped to "all environments" is how production once ended
up on the Dev database (see `scripts/fix-production-oauth.ps1`).

Anon and service-role keys are project-scoped. Never reuse one project's key
against the other.

## Enforcement

`supabasePublicConfig()` in `src/lib/env.ts` calls
`assertProjectMatchesEnvironment()`, which throws when `VERCEL_ENV=production`
resolves to anything but the Prod ref, and when any other Vercel environment
resolves to anything but the Dev ref. Local (no `VERCEL_ENV`) is unconstrained.

## Checking which project you target

```bash
npm run which-db
```

Reports the resolved ref using Next's own env-file precedence, and whether
`E2E_FAKE_BACKEND` is short-circuiting Supabase entirely
(`src/lib/data/repo.ts` picks `FakeRepo` over `SupabaseRepo`).

To confirm what actually shipped in a build:

```bash
npm run build && grep -rlo "ikqztmmyltuuacjnqmie\|zonvummielhetzcyootb" .next/static | head
```

## Migrations

Dev first, always. Prod only after Dev is verified.

```bash
supabase link --project-ref ikqztmmyltuuacjnqmie && supabase db push   # dev
supabase link --project-ref zonvummielhetzcyootb && supabase db push   # prod
```

Check for drift before every push: `supabase db diff --linked`.
Enable `pg_cron` per project before pushing, or the expiry schedule silently
skips (see README "Supabase (one-time)").

`public.users` is owned by the **mobile app repo**; this repo only attaches
payment-related objects to it. Coordinate changes to `users` across repos.

## MCP access

`.mcp.json` (gitignored, holds a personal access token) configures two
read-only Supabase MCP servers, `supabase-dev` and `supabase-prod`. Copy
`.mcp.json.example` and insert your own token from
https://supabase.com/dashboard/account/tokens.

Read-only is deliberate: schema changes belong in `supabase/migrations/`
under version control, not applied ad hoc.
