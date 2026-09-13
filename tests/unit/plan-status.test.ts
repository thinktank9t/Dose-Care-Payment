import { test } from "node:test";
import assert from "node:assert/strict";
import { planStatus } from "../../src/lib/plan-status";

const now = new Date("2026-09-13T12:00:00Z");

test("never subscribed -> free", () => {
  assert.deepEqual(planStatus({ plan: "free", premium_until: null, plan_period: null }, now), { kind: "free" });
});

test("premium with future end -> active with period", () => {
  const s = planStatus({ plan: "premium", premium_until: "2026-10-13T12:00:00Z", plan_period: "monthly" }, now);
  assert.equal(s.kind, "active");
  if (s.kind === "active") {
    assert.equal(s.period, "monthly");
    assert.equal(s.until?.toISOString(), "2026-10-13T12:00:00.000Z");
  }
});

test("premium with null end -> active, no expiry", () => {
  const s = planStatus({ plan: "premium", premium_until: null, plan_period: null }, now);
  assert.equal(s.kind, "active");
  if (s.kind === "active") assert.equal(s.until, null);
});

test("past end -> ended, even if plan still says premium (cron not yet run)", () => {
  const s = planStatus({ plan: "premium", premium_until: "2026-09-01T00:00:00Z", plan_period: "yearly" }, now);
  assert.equal(s.kind, "ended");
});

test("past end with plan=free -> ended (history is kept)", () => {
  const s = planStatus({ plan: "free", premium_until: "2026-09-01T00:00:00Z", plan_period: "yearly" }, now);
  assert.equal(s.kind, "ended");
});
