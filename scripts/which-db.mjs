/**
 * Prints which Supabase project this working tree actually targets, using
 * Next's own env-file precedence. Run: node scripts/which-db.mjs
 */
import pkg from "@next/env";
const { loadEnvConfig } = pkg;

const dev = process.env.NODE_ENV !== "production";
const { loadedEnvFiles } = loadEnvConfig(process.cwd(), dev);

const REFS = { zonvummielhetzcyootb: "PROD", ikqztmmyltuuacjnqmie: "DEV" };
const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
const ref = url.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1] ?? null;
const fake =
  process.env.E2E_FAKE_BACKEND === "1" &&
  process.env.VERCEL_ENV !== "production";

console.log("NODE_ENV     :", process.env.NODE_ENV ?? "(unset)");
console.log("VERCEL_ENV   :", process.env.VERCEL_ENV ?? "(local)");
console.log("env files    :", loadedEnvFiles.map((f) => f.path).join(", ") || "(none)");
console.log("project ref  :", ref ?? "(unset)", ref ? `(${REFS[ref] ?? "UNKNOWN"})` : "");
console.log("fake backend :", fake);
console.log("effective    :", fake ? "in-memory FakeRepo — Supabase NOT contacted" : `SupabaseRepo -> ${url || "(unset)"}`);

if (ref && !REFS[ref]) process.exitCode = 1;
