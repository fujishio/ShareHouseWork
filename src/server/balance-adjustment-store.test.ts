import test from "node:test";
import assert from "node:assert/strict";
import {
  createBalanceAdjustment,
  listBalanceAdjustments,
} from "./balance-adjustment-store.ts";
import { createFakeFirestoreDb } from "./test-helpers/fake-firestore-db.ts";

test("listBalanceAdjustments: month 指定で adjustedAt 範囲クエリを追加", async () => {
  const fake = createFakeFirestoreDb({
    balanceAdjustments: {
      b1: {
        houseId: "h1",
        amount: 1000,
        reason: "調整",
        adjustedBy: "あなた",
        adjustedAt: "2026-03-01",
      },
    },
  });

  const rows = await listBalanceAdjustments("h1", "2026-03", fake.db);

  assert.equal(rows.length, 1);
  assert.equal(fake.calls.where.length, 3);
  assert.equal(fake.calls.orderBy[0]?.field, "adjustedAt");
});

test("createBalanceAdjustment: 保存と map が行われる", async () => {
  const fake = createFakeFirestoreDb({ balanceAdjustments: {} });

  const created = await createBalanceAdjustment(
    {
      houseId: "h1",
      amount: -1200,
      reason: "差額",
      adjustedBy: "あなた",
      adjustedAt: "2026-03-01",
    },
    fake.db
  );

  assert.equal(created.id, "new-1");
  assert.equal(fake.seed.balanceAdjustments?.["new-1"]?.amount, -1200);
});
