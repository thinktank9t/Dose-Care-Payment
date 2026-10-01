import { test } from "node:test";
import assert from "node:assert/strict";
import { premiumView, type PremiumStatusResult } from "../../src/lib/premium-status";

const now = new Date("2026-10-01T12:00:00Z");

const base: PremiumStatusResult = {
  code: "OK",
  plan: "free",
  days_left: null,
  is_premium: false,
  has_pending: false,
  plan_period: null,
  plan_source: null,
  last_payment: null,
  premium_since: null,
  premium_until: null,
  recent_requests: [],
};

test("the sample payload from a live premium user -> premium with its days left", () => {
  const v = premiumView(
    {
      ...base,
      plan: "premium",
      days_left: 30,
      is_premium: true,
      plan_period: "monthly",
      plan_source: "bkash",
      last_payment: { amount: 1338, trx_id: "DIT****", paid_at: "2026-09-30T21:30:51.120593+00:00" },
      premium_until: "2026-10-30T21:30:51.120593+00:00",
    },
    now,
  );
  assert.equal(v.kind, "premium");
  if (v.kind !== "premium") return;
  assert.equal(v.daysLeft, 30);
  assert.equal(v.period, "monthly");
  assert.equal(v.pendingExtra, false);
  assert.equal(v.lastPayment?.trx_id, "DIT****");
});

test("premium with no days_left -> counted from premium_until", () => {
  const v = premiumView(
    { ...base, is_premium: true, plan: "premium", premium_until: "2026-10-11T12:00:00Z" },
    now,
  );
  assert.equal(v.kind === "premium" && v.daysLeft, 10);
});

test("premium with no end date -> active, no day count", () => {
  const v = premiumView({ ...base, is_premium: true, plan: "premium" }, now);
  assert.equal(v.kind === "premium" && v.daysLeft, null);
});

test("pending payment and no premium -> pending, not an error", () => {
  const v = premiumView({ ...base, has_pending: true }, now);
  assert.equal(v.kind, "pending");
});

test("pending on top of live premium -> premium wins, flagged as an extension", () => {
  const v = premiumView(
    { ...base, is_premium: true, plan: "premium", has_pending: true, premium_until: "2026-10-30T00:00:00Z" },
    now,
  );
  assert.equal(v.kind === "premium" && v.pendingExtra, true);
});

test("past premium_until and nothing pending -> expired", () => {
  const v = premiumView({ ...base, premium_until: "2026-09-01T00:00:00Z" }, now);
  assert.equal(v.kind, "expired");
  assert.equal(v.kind === "expired" && v.until.toISOString(), "2026-09-01T00:00:00.000Z");
});

test("never subscribed -> none", () => {
  assert.deepEqual(premiumView(base, now), { kind: "none" });
});

test("a malformed date is ignored rather than crashing the card", () => {
  const v = premiumView({ ...base, is_premium: true, plan: "premium", premium_until: "not-a-date" }, now);
  assert.equal(v.kind === "premium" && v.until, null);
});
