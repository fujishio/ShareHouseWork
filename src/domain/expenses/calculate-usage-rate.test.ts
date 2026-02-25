import test from "node:test";
import assert from "node:assert/strict";
import { calculateUsageRate } from "./calculate-usage-rate.ts";

test("0除算を避けて0を返す", () => {
  assert.equal(calculateUsageRate(0, 1000), 0);
});

test("100%を超える値は100にクランプされる", () => {
  assert.equal(calculateUsageRate(1000, 5000), 100);
});

test("負値や異常値はフォールバックされる", () => {
  assert.equal(calculateUsageRate(-1, 200), 0);
  assert.equal(calculateUsageRate(1000, -100), 0);
  assert.equal(calculateUsageRate(Number.NaN, 100), 0);
});

test("正常系で丸めた使用率を返す", () => {
  assert.equal(calculateUsageRate(60000, 42500), 71);
});
