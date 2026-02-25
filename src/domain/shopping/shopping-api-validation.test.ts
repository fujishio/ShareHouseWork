import test from "node:test";
import assert from "node:assert/strict";
import {
  getJstDateString,
  isTrimmedNonEmpty,
  normalizeShoppingDate,
} from "./shopping-api-validation.ts";

test("isTrimmedNonEmpty: 空白のみを拒否する", () => {
  assert.equal(isTrimmedNonEmpty(""), false);
  assert.equal(isTrimmedNonEmpty("   "), false);
  assert.equal(isTrimmedNonEmpty("家主"), true);
});

test("normalizeShoppingDate: YYYY-MM-DD を受け入れる", () => {
  assert.equal(normalizeShoppingDate("2026-02-25"), "2026-02-25");
});

test("normalizeShoppingDate: ISO日時を日付へ正規化する", () => {
  assert.equal(
    normalizeShoppingDate("2026-02-25T01:23:45.000+09:00"),
    "2026-02-24"
  );
});

test("normalizeShoppingDate: 無効日付を拒否する", () => {
  assert.equal(normalizeShoppingDate("2026-02-30"), null);
  assert.equal(normalizeShoppingDate("invalid"), null);
});

test("getJstDateString: JST基準の日付を返す", () => {
  assert.equal(getJstDateString(new Date("2026-02-25T15:30:00.000Z")), "2026-02-26");
  assert.equal(getJstDateString(new Date("2026-02-25T00:30:00.000Z")), "2026-02-25");
});
