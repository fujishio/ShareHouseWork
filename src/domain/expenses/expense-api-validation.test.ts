import test from "node:test";
import assert from "node:assert/strict";
import {
  isTrimmedNonEmpty,
  normalizePurchasedAt,
} from "./expense-api-validation.ts";

test("isTrimmedNonEmpty: 空文字と空白のみを拒否する", () => {
  assert.equal(isTrimmedNonEmpty(""), false);
  assert.equal(isTrimmedNonEmpty("   "), false);
  assert.equal(isTrimmedNonEmpty("あなた"), true);
});

test("normalizePurchasedAt: YYYY-MM-DD をそのまま受け入れる", () => {
  assert.equal(normalizePurchasedAt("2026-02-25"), "2026-02-25");
});

test("normalizePurchasedAt: ISO日時はJST基準の日付へ正規化する", () => {
  // JST 15:30 = UTC 06:30 → both Feb 25
  assert.equal(
    normalizePurchasedAt("2026-02-25T15:30:00.000+09:00"),
    "2026-02-25"
  );
  // JST Feb 25 01:30 = UTC Feb 24 16:30 → should normalize to JST date 2026-02-25
  assert.equal(
    normalizePurchasedAt("2026-02-25T01:30:00.000+09:00"),
    "2026-02-25"
  );
  // UTC Feb 24 16:00 = JST Feb 25 01:00 → should normalize to JST date 2026-02-25
  assert.equal(
    normalizePurchasedAt("2026-02-24T16:00:00.000Z"),
    "2026-02-25"
  );
});

test("normalizePurchasedAt: 無効な日付を拒否する", () => {
  assert.equal(normalizePurchasedAt("not-a-date"), null);
  assert.equal(normalizePurchasedAt("2026-02-30"), null);
  assert.equal(normalizePurchasedAt("2026-13-01"), null);
});
