import test from "node:test";
import assert from "node:assert/strict";
import { monthToDateRange } from "./month-range.ts";

test("monthToDateRange: 正常な月を from/to 範囲へ変換", () => {
  assert.deepEqual(monthToDateRange("2026-03"), {
    from: "2026-03-01",
    to: "2026-04-01",
  });
});

test("monthToDateRange: 年またぎ（12月）の to を翌年1月にする", () => {
  assert.deepEqual(monthToDateRange("2026-12"), {
    from: "2026-12-01",
    to: "2027-01-01",
  });
});

test("monthToDateRange: 不正フォーマットは null", () => {
  assert.equal(monthToDateRange("2026/03"), null);
  assert.equal(monthToDateRange("26-03"), null);
  assert.equal(monthToDateRange("2026-3"), null);
});

test("monthToDateRange: 範囲外の月は null", () => {
  assert.equal(monthToDateRange("2026-00"), null);
  assert.equal(monthToDateRange("2026-13"), null);
});
