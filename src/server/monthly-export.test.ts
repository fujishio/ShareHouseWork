import test from "node:test";
import assert from "node:assert/strict";
import { buildMonthlyOperationsCsv } from "./monthly-export.ts";
import type {
  ExpenseRecord,
  ShoppingItem,
  TaskCompletionRecord,
} from "../types/index.ts";

const records: TaskCompletionRecord[] = [
  {
    id: 1,
    taskId: 1,
    taskName: "A",
    points: 5,
    completedBy: "あなた",
    completedAt: "2026-02-01T10:00:00.000Z",
    source: "app",
  },
  {
    id: 2,
    taskId: 2,
    taskName: "B",
    points: 10,
    completedBy: "あなた",
    completedAt: "2026-02-02T10:00:00.000Z",
    source: "line",
  },
  {
    id: 3,
    taskId: 2,
    taskName: "C",
    points: 7,
    completedBy: "パートナー",
    completedAt: "2026-02-03T10:00:00.000Z",
    source: "app",
  },
  {
    id: 4,
    taskId: 3,
    taskName: "D",
    points: 2,
    completedBy: "あなた",
    completedAt: "2026-03-01T10:00:00.000Z",
    source: "app",
  },
];

const expenses: ExpenseRecord[] = [
  {
    id: 1,
    title: "電気代",
    amount: 12000,
    category: "水道・光熱費",
    purchasedBy: "あなた",
    purchasedAt: "2026-02-05T10:00:00.000Z",
  },
  {
    id: 2,
    title: "食材",
    amount: 5000,
    category: "食費",
    purchasedBy: "パートナー",
    purchasedAt: "2026-03-01T10:00:00.000Z",
  },
];

const shoppingItems: ShoppingItem[] = [
  {
    id: 1,
    name: "洗剤",
    quantity: "1",
    memo: "",
    addedBy: "あなた",
    addedAt: "2026-02-02T10:00:00.000Z",
    checkedBy: "あなた",
    checkedAt: "2026-02-02T12:00:00.000Z",
  },
  {
    id: 2,
    name: "ティッシュ",
    quantity: "2",
    memo: "大容量",
    addedBy: "パートナー",
    addedAt: "2026-01-28T10:00:00.000Z",
    canceledBy: "あなた",
    canceledAt: "2026-02-01T09:00:00.000Z",
  },
];

test("member summary and TOTAL row are generated for a target month", () => {
  const csv = buildMonthlyOperationsCsv({
    month: "2026-02",
    taskCompletions: records,
    expenses,
    shoppingItems,
  });
  assert.match(csv, /# task_member_summary/);
  assert.match(csv, /2026-02,あなた,2,15,1,1,/);
  assert.match(csv, /2026-02,パートナー,1,7,1,0,/);
  assert.match(csv, /2026-02,TOTAL,3,22,2,1,/);
  assert.match(csv, /# expenses/);
  assert.match(csv, /2026-02,1,電気代,12000,水道・光熱費,あなた,/);
  assert.match(csv, /# shopping/);
  assert.match(csv, /2026-02,1,洗剤,1,,あなた,/);
  assert.match(csv, /2026-02,2,ティッシュ,2,大容量,パートナー,/);
});

test("empty month returns N/A row", () => {
  const csv = buildMonthlyOperationsCsv({
    month: "2026-04",
    taskCompletions: records,
    expenses,
    shoppingItems,
  });
  assert.match(csv, /2026-04,N\/A,0,0,0,0,,/);
  assert.match(csv, /2026-04,N\/A,,0,,,,false,,,/);
  assert.match(csv, /2026-04,N\/A,,,,,,none,,,,/);
});

test("invalid month format throws", () => {
  assert.throws(() =>
    buildMonthlyOperationsCsv({
      month: "2026/02",
      taskCompletions: records,
      expenses,
      shoppingItems,
    })
  );
});
