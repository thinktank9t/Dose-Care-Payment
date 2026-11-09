import { test } from "node:test";
import assert from "node:assert/strict";
import { isValidTrxId, normalizeBdMobile, normalizeTrxId } from "../../src/lib/trx";
import { safeNextPath } from "../../src/lib/auth/next-path";
import { formatBdt, formatNumber, formatPercent, localizeDigits, userReference } from "../../src/lib/format";

test("trx id is trimmed, upper-cased and validated", () => {
  assert.equal(normalizeTrxId("  9gh7x2 k1ab "), "9GH7X2K1AB");
  assert.equal(isValidTrxId("9GH7X2K1AB"), true);
  assert.equal(isValidTrxId("SHORT"), false);
  assert.equal(isValidTrxId("9GH7X2K1AB1"), false);
  assert.equal(isValidTrxId("9GH7X2-1AB"), false);
});

test("bd mobile normalisation", () => {
  assert.equal(normalizeBdMobile("+880 1712-345678"), "01712345678");
  assert.equal(normalizeBdMobile("01712345678"), "01712345678");
});

test("safeNextPath only allows same-origin page paths", () => {
  assert.equal(safeNextPath("/pay?plan=yearly"), "/pay?plan=yearly");
  assert.equal(safeNextPath("https://evil.example"), "/account");
  assert.equal(safeNextPath("//evil.example"), "/account");
  assert.equal(safeNextPath("/auth/callback"), "/account");
  assert.equal(safeNextPath(null), "/account");
});

test("formatting", () => {
  assert.equal(formatBdt(1234, "en"), "৳ 1,234");
  assert.equal(formatBdt("4100.00", "en"), "৳ 4,100");
  assert.equal(formatBdt(null, "en"), "৳ —");
  assert.equal(formatBdt(3299, "bn"), "৳ ৩,২৯৯");
  assert.equal(userReference("5d8d4d1e-0000-4000-8000-000000000000"), "5D8D4D");
  assert.equal(formatNumber(85, "en"), "85");
  assert.equal(formatNumber(85, "bn"), "৮৫");
  assert.equal(formatPercent(85, "bn"), "৮৫%");
  assert.equal(localizeDigits("3 medicines", "bn"), "৩ medicines");
  assert.equal(localizeDigits("3 medicines", "en"), "3 medicines");
});
