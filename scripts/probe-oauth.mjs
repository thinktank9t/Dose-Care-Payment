import { readFileSync, writeFileSync } from "fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);

const redirectTo = `${env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")}/auth/callback`;
const url = new URL(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/authorize`);
url.searchParams.set("provider", "google");
url.searchParams.set("redirect_to", redirectTo);

const res = await fetch(url, {
  headers: {
    apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    Authorization: `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
  },
  redirect: "manual",
});

const location = res.headers.get("location");
const out = { status: res.status, app_redirectTo: redirectTo };
if (location) {
  const g = new URL(location);
  out.redirect_uri = g.searchParams.get("redirect_uri");
  out.client_id = g.searchParams.get("client_id");
}
writeFileSync("scripts/oauth-probe.json", JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
