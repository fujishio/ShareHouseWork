import test from "node:test";
import assert from "node:assert/strict";
import {
  createTaskCompletion,
  listTaskCompletions,
  updateTaskCompletionCancellation,
} from "./task-completions-store.ts";
import { createFakeFirestoreDb } from "./test-helpers/fake-firestore-db.ts";

test("listTaskCompletions: houseId 条件と completedAt desc を設定", async () => {
  const fake = createFakeFirestoreDb({
    taskCompletions: {
      c1: {
        houseId: "h1",
        taskId: "t1",
        taskName: "掃除",
        points: 2,
        completedBy: "あなた",
        completedAt: "2026-03-01T00:00:00.000Z",
        source: "app",
        canceledAt: null,
        canceledBy: null,
        cancelReason: null,
      },
    },
  });

  const records = await listTaskCompletions("h1", fake.db);

  assert.equal(records.length, 1);
  assert.equal(fake.calls.orderBy[0]?.field, "completedAt");
});

test("createTaskCompletion: canceled 系を null 補完して作成", async () => {
  const fake = createFakeFirestoreDb({ taskCompletions: {} });

  const created = await createTaskCompletion(
    {
      houseId: "h1",
      taskId: "t1",
      taskName: "掃除",
      points: 2,
      completedBy: "あなた",
      completedAt: "2026-03-01T00:00:00.000Z",
      source: "app",
    },
    fake.db
  );

  assert.equal(created.id, "new-1");
  assert.equal(fake.seed.taskCompletions?.["new-1"]?.canceledAt, null);
});

test("updateTaskCompletionCancellation: 初回取消は更新、再取消は既存を返す", async () => {
  const fake = createFakeFirestoreDb({
    taskCompletions: {
      c1: {
        houseId: "h1",
        taskId: "t1",
        taskName: "掃除",
        points: 2,
        completedBy: "あなた",
        completedAt: "2026-03-01T00:00:00.000Z",
        source: "app",
        canceledAt: null,
        canceledBy: null,
        cancelReason: null,
      },
      c2: {
        houseId: "h1",
        taskId: "t1",
        taskName: "掃除",
        points: 2,
        completedBy: "あなた",
        completedAt: "2026-03-01T00:00:00.000Z",
        source: "app",
        canceledAt: "2026-03-02T00:00:00.000Z",
        canceledBy: "あなた",
        cancelReason: "重複",
      },
    },
  });

  const canceled = await updateTaskCompletionCancellation(
    "c1",
    "あなた",
    "重複",
    "2026-03-05T00:00:00.000Z",
    fake.db
  );
  const already = await updateTaskCompletionCancellation(
    "c2",
    "あなた",
    "重複",
    "2026-03-05T00:00:00.000Z",
    fake.db
  );

  assert.equal(canceled?.canceledAt, "2026-03-05T00:00:00.000Z");
  assert.equal(already?.canceledAt, "2026-03-02T00:00:00.000Z");
});
