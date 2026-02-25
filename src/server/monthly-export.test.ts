import test from "node:test";
import assert from "node:assert/strict";
import { buildMonthlyOperationsCsv } from "./monthly-export.ts";
import type { TaskCompletionRecord } from "../types/index.ts";

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

test("member summary and TOTAL row are generated for a target month", () => {
  const csv = buildMonthlyOperationsCsv(records, "2026-02");
  assert.match(csv, /2026-02,あなた,2,15,1,1,/);
  assert.match(csv, /2026-02,パートナー,1,7,1,0,/);
  assert.match(csv, /2026-02,TOTAL,3,22,2,1,/);
});

test("empty month returns N/A row", () => {
  const csv = buildMonthlyOperationsCsv(records, "2026-04");
  assert.match(csv, /2026-04,N\/A,0,0,0,0,,/);
});

test("invalid month format throws", () => {
  assert.throws(() => buildMonthlyOperationsCsv(records, "2026/02"));
});
