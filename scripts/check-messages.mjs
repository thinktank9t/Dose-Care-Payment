#!/usr/bin/env node
// Fails when messages/en.json and messages/bn.json don't have identical keys
// (recursively), or when a value is an empty string.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const load = (l) => JSON.parse(readFileSync(resolve(root, "messages", `${l}.json`), "utf8"));

function flatten(obj, prefix = "", out = new Map()) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) flatten(v, key, out);
    else out.set(key, v);
  }
  return out;
}

const en = flatten(load("en"));
const bn = flatten(load("bn"));
const problems = [];

for (const k of en.keys()) if (!bn.has(k)) problems.push(`missing in bn: ${k}`);
for (const k of bn.keys()) if (!en.has(k)) problems.push(`missing in en: ${k}`);
for (const [k, v] of en) if (typeof v !== "string" || v.trim() === "") problems.push(`empty in en: ${k}`);
for (const [k, v] of bn) if (typeof v !== "string" || v.trim() === "") problems.push(`empty in bn: ${k}`);

// ICU placeholders must match too ({name}, {count, plural, ...}).
const args = (s) => [...s.matchAll(/\{\s*([a-zA-Z0-9_]+)/g)].map((m) => m[1]).sort().join(",");
for (const [k, v] of en) {
  const b = bn.get(k);
  if (typeof b === "string" && args(v) !== args(b)) {
    problems.push(`placeholder mismatch: ${k} (en: ${args(v) || "-"} / bn: ${args(b) || "-"})`);
  }
}

if (problems.length) {
  console.error(`messages check failed:\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
console.log(`messages ok: ${en.size} keys in en and bn`);
