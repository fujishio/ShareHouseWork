import test from "node:test";
import assert from "node:assert/strict";
import { formatRelativeTime } from "./time.ts";

const NOW = new Date("2026-02-25T12:00:00.000Z");

test("1分未満はたった今", () => {
  const date = new Date(NOW.getTime() - 30 * 1000);
  assert.equal(formatRelativeTime(date, NOW), "たった今");
});

test("59分までは分表示", () => {
  const date = new Date(NOW.getTime() - 59 * 60 * 1000);
  assert.equal(formatRelativeTime(date, NOW), "59分前");
});

test("60分以上24時間未満は時間表示", () => {
  const oneHour = new Date(NOW.getTime() - 60 * 60 * 1000);
  const twentyThreeHours = new Date(NOW.getTime() - 23 * 60 * 60 * 1000);
  assert.equal(formatRelativeTime(oneHour, NOW), "1時間前");
  assert.equal(formatRelativeTime(twentyThreeHours, NOW), "23時間前");
});

test("24時間以上48時間未満は昨日", () => {
  const yesterday = new Date(NOW.getTime() - 25 * 60 * 60 * 1000);
  assert.equal(formatRelativeTime(yesterday, NOW), "昨日");
});

test("48時間以上は日表示", () => {
  const twoDays = new Date(NOW.getTime() - 48 * 60 * 60 * 1000);
  assert.equal(formatRelativeTime(twoDays, NOW), "2日前");
});
