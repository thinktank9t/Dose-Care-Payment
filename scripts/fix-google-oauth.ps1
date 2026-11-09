# Fix Google Error 400: redirect_uri_mismatch for Dose Care + Supabase.
# Run: powershell -ExecutionPolicy Bypass -File .\scripts\fix-google-oauth.ps1

$ErrorActionPreference = "Stop"
$ClientId = "498654919373-ge2em6qhiffvi52c36ai7cgmo1lc187c.apps.googleusercontent.com"
$RequiredUri = "https://zonvummielhetzcyootb.supabase.co/auth/v1/callback"
$GoogleUrl = "https://console.cloud.google.com/apis/credentials/oauthclient/$ClientId"
$SupabaseUrl = "https://supabase.com/dashboard/project/zonvummielhetzcyootb/auth/url-configuration"
$SignInUrl = "http://localhost:3000/en/sign-in"

Write-Host ""
Write-Host "  Dose Care — fix Google redirect_uri_mismatch" -ForegroundColor Cyan
Write-Host "  This is a Google Cloud setting, not an app-code bug." -ForegroundColor DarkGray
Write-Host ""

Write-Host "STAGE 1/3 — Google Cloud: Authorized redirect URI" -ForegroundColor Yellow
Write-Host "  Opening the OAuth client used by Supabase…"
Write-Host "  Client ID: $ClientId"
Write-Host "  App name shown by Google today: Potato App"
Write-Host ""
Write-Host "  In that page:"
Write-Host "    1. Under Authorized redirect URIs, click ADD URI"
Write-Host "    2. Paste EXACTLY (no trailing slash, no path change):"
Write-Host "       $RequiredUri" -ForegroundColor Green
Write-Host "    3. Click SAVE"
Write-Host "  Do NOT add http://localhost:3000/auth/callback here."
Write-Host ""
Start-Process $GoogleUrl
Read-Host "Press Enter after you saved the Google redirect URI"

Write-Host ""
Write-Host "STAGE 2/3 — Supabase: allow the site callback" -ForegroundColor Yellow
Write-Host "  Opening Supabase URL Configuration…"
Write-Host "  Confirm Redirect URLs includes:"
Write-Host "    http://localhost:3000/auth/callback" -ForegroundColor Green
Write-Host "    (and your production https://<host>/auth/callback when you deploy)"
Write-Host "  Site URL should be: http://localhost:3000 (for local testing)"
Write-Host ""
Start-Process $SupabaseUrl
Read-Host "Press Enter after Supabase redirect URLs look correct"

Write-Host ""
Write-Host "STAGE 3/3 — Test sign-in" -ForegroundColor Yellow
Write-Host "  Opening local sign-in. Use Continue with Google."
Write-Host "  Wait ~1–5 minutes after saving Google if it still fails once."
Write-Host ""
Start-Process $SignInUrl
Read-Host "Press Enter when Google sign-in works (or to finish)"

Write-Host ""
Write-Host "  Done. If it still fails, open Supabase → Auth → Providers → Google" -ForegroundColor Cyan
Write-Host "  and confirm Client ID matches:"
Write-Host "  $ClientId"
Write-Host "  (Wrong Client ID / non-Web client also causes this error.)"
Write-Host ""
