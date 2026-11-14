# Fix production Google login on https://www.dose-care.com
#
# Root cause: production Vercel points at Supabase DEV
#   https://ikqztmmyltuuacjnqmie.supabase.co
# and Google client 811323301567-… which is missing the Dev callback URI.
# Local / Dose Care Google client is wired to Prod
#   https://zonvummielhetzcyootb.supabase.co
#
# Recommended: point production at Prod Supabase (matches this repo).

$ErrorActionPreference = "Stop"

$ProdSupabase = "https://zonvummielhetzcyootb.supabase.co"
$DevSupabase = "https://ikqztmmyltuuacjnqmie.supabase.co"
$Site = "https://www.dose-care.com"
$WebClientId = "1025743361704-7g2ir69alt94mrhvinnta17bq7fhggpj.apps.googleusercontent.com"
$ProdCallback = "$ProdSupabase/auth/v1/callback"
$DevCallback = "$DevSupabase/auth/v1/callback"

Write-Host ""
Write-Host "  Fix production Google OAuth (dose-care.com)" -ForegroundColor Cyan
Write-Host ""

Write-Host "STAGE 1/3 — Vercel env (production)" -ForegroundColor Yellow
Write-Host "  Open Vercel → dose-care.com project → Settings → Environment Variables"
Write-Host "  Set for Production:"
Write-Host "    NEXT_PUBLIC_SUPABASE_URL=$ProdSupabase" -ForegroundColor Green
Write-Host "    NEXT_PUBLIC_SITE_URL=$Site" -ForegroundColor Green
Write-Host "  (Keep NEXT_PUBLIC_SUPABASE_ANON_KEY + SUPABASE_SERVICE_ROLE_KEY for Prod)"
Write-Host "  Redeploy after saving."
Write-Host ""
Start-Process "https://vercel.com/dashboard"
Read-Host "Press Enter after Vercel Production env is updated and redeployed"

Write-Host ""
Write-Host "STAGE 2/3 — Google Cloud (Dose Care web client)" -ForegroundColor Yellow
Write-Host "  Client: $WebClientId"
Write-Host "  Authorized redirect URIs must include:"
Write-Host "    $ProdCallback" -ForegroundColor Green
Write-Host "  Authorized JavaScript origins should include:"
Write-Host "    $Site" -ForegroundColor Green
Write-Host "    http://localhost:3000"
Write-Host ""
Start-Process "https://console.cloud.google.com/auth/clients?project=dose-care-514209"
Read-Host "Press Enter after Google client is saved"

Write-Host ""
Write-Host "STAGE 3/3 — Supabase Prod URL allowlist" -ForegroundColor Yellow
Write-Host "  Authentication → URL Configuration → Redirect URLs must include:"
Write-Host "    $Site/auth/callback" -ForegroundColor Green
Write-Host "  Site URL: $Site"
Write-Host ""
Start-Process "https://supabase.com/dashboard/project/zonvummielhetzcyootb/auth/url-configuration"
Read-Host "Press Enter after Supabase redirect URLs are saved"

Write-Host ""
Write-Host "  Test: $Site/bn/sign-in → Continue with Google" -ForegroundColor Cyan
Start-Process "$Site/bn/sign-in"
Write-Host ""
Write-Host "  If you must stay on Dev Supabase instead, add this Google redirect URI"
Write-Host "  on whatever client Dev uses (811323301567-…):"
Write-Host "    $DevCallback" -ForegroundColor Yellow
Write-Host ""
