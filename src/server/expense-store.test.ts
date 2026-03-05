import test from "node:test";
import assert from "node:assert/strict";
import {
  createExpense,
  listExpenses,
  updateExpenseCancellation,
} from "./expense-store.ts";
import { createFakeFirestoreDb } from "./test-helpers/fake-firestore-db.ts";

test("listExpenses: month 指定で purchasedAt 範囲クエリを追加", async () => {
  const fake = createFakeFirestoreDb({
    expenses: {
      e1: {
        houseId: "h1",
        title: "電気代",
        amount: 1000,
        category: "水道・光熱費",
        purchasedBy: "あなた",
        purchasedAt: "2026-03-01",
        canceledAt: null,
        canceledBy: null,
        cancelReason: null,
      },
    },
  });

  const expenses = await listExpenses("h1", "2026-03", fake.db);

  assert.equal(expenses.length, 1);
  assert.equal(fake.calls.where.length, 3);
  assert.deepEqual(fake.calls.where.map((call) => call.field), [
    "houseId",
    "purchasedAt",
    "purchasedAt",
  ]);
  assert.equal(fake.calls.orderBy[0]?.field, "purchasedAt");
});

test("listExpenses: month 不正形式なら範囲クエリを追加しない", async () => {
  const fake = createFakeFirestoreDb({ expenses: {} });

  await listExpenses("h1", "2026/03", fake.db);

  assert.equal(fake.calls.where.length, 1);
  assert.equal(fake.calls.where[0]?.field, "houseId");
});

test("createExpense: canceled* を null で保存", async () => {
  const fake = createFakeFirestoreDb({ expenses: {} });

  const created = await createExpense(
    {
      houseId: "h1",
      title: "食材",
      amount: 3000,
      category: "食費",
      purchasedBy: "あなた",
      purchasedAt: "2026-03-02",
    },
    fake.db
  );

  assert.equal(created.id, "new-1");
  assert.equal(fake.seed.expenses?.["new-1"]?.canceledAt, null);
  assert.equal(fake.seed.expenses?.["new-1"]?.canceledBy, null);
  assert.equal(fake.seed.expenses?.["new-1"]?.cancelReason, null);
});

test("updateExpenseCancellation: 初回取消は更新、再取消は既存を返す", async () => {
  const fake = createFakeFirestoreDb({
    expenses: {
      e1: {
        houseId: "h1",
        title: "電気代",
        amount: 1000,
        category: "水道・光熱費",
        purchasedBy: "あなた",
        purchasedAt: "2026-03-01",
        canceledAt: null,
        canceledBy: null,
        cancelReason: null,
      },
      e2: {
        houseId: "h1",
        title: "食材",
        amount: 2000,
        category: "食費",
        purchasedBy: "あなた",
        purchasedAt: "2026-03-01",
        canceledAt: "2026-03-01T00:00:00.000Z",
        canceledBy: "あなた",
        cancelReason: "重複",
      },
    },
  });

  const canceled = await updateExpenseCancellation(
    "e1",
    { canceledBy: "あなた", cancelReason: "重複" },
    "2026-03-05T00:00:00.000Z",
    fake.db
  );
  const already = await updateExpenseCancellation(
    "e2",
    { canceledBy: "あなた", cancelReason: "重複" },
    "2026-03-05T00:00:00.000Z",
    fake.db
  );

  assert.equal(canceled?.canceledAt, "2026-03-05T00:00:00.000Z");
  assert.equal(already?.canceledAt, "2026-03-01T00:00:00.000Z");
});
