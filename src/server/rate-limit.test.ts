import test from "node:test";
import assert from "node:assert/strict";
import { takeRateLimit } from "./rate-limit.ts";

test("takeRateLimit: limitを超えると拒否される", () => {
  const now = Date.now();
  const key = `rate-limit-test-${now}`;
  const limit = 3;

  const r1 = takeRateLimit({ key, limit, windowMs: 60_000, now });
  const r2 = takeRateLimit({ key, limit, windowMs: 60_000, now });
  const r3 = takeRateLimit({ key, limit, windowMs: 60_000, now });
  const r4 = takeRateLimit({ key, limit, windowMs: 60_000, now });

  assert.equal(r1.allowed, true);
  assert.equal(r2.allowed, true);
  assert.equal(r3.allowed, true);
  assert.equal(r4.allowed, false);
});

test("takeRateLimit: window経過後にリセットされる", () => {
  const baseNow = Date.now();
  const key = `rate-limit-reset-${baseNow}`;

  const first = takeRateLimit({ key, limit: 1, windowMs: 1_000, now: baseNow });
  const blocked = takeRateLimit({ key, limit: 1, windowMs: 1_000, now: baseNow + 100 });
  const reset = takeRateLimit({ key, limit: 1, windowMs: 1_000, now: baseNow + 1_001 });

  assert.equal(first.allowed, true);
  assert.equal(blocked.allowed, false);
  assert.equal(reset.allowed, true);
});

