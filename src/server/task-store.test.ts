import test from "node:test";
import assert from "node:assert/strict";
import {
  createTask,
  listTasks,
  readTaskById,
  updateTask,
  updateTaskDeletion,
} from "./task-store.ts";
import { createFakeFirestoreDb } from "./test-helpers/fake-firestore-db.ts";

test("listTasks: houseId + deletedAt(null) で絞り込む", async () => {
  const fake = createFakeFirestoreDb({
    tasks: {
      t1: {
        houseId: "h1",
        name: "掃除",
        category: "共用部の掃除",
        points: 2,
        frequencyDays: 7,
        deletedAt: null,
      },
    },
  });

  const tasks = await listTasks("h1", fake.db);

  assert.equal(tasks.length, 1);
  assert.equal(tasks[0]?.id, "t1");
  assert.equal(fake.calls.where.length, 2);
  assert.deepEqual(fake.calls.where.map((call) => call.field), ["houseId", "deletedAt"]);
});

test("createTask: deletedAt=null で作成される", async () => {
  const fake = createFakeFirestoreDb({ tasks: {} });

  const created = await createTask(
    {
      houseId: "h1",
      name: "洗濯",
      category: "共用部の掃除",
      points: 3,
      frequencyDays: 3,
    },
    fake.db
  );

  assert.equal(created.id, "new-1");
  assert.equal(fake.seed.tasks?.["new-1"]?.deletedAt, null);
});

test("readTaskById: 既存は取得、未存在は null", async () => {
  const fake = createFakeFirestoreDb({
    tasks: {
      t1: {
        houseId: "h1",
        name: "掃除",
        category: "共用部の掃除",
        points: 2,
        frequencyDays: 7,
        deletedAt: null,
      },
    },
  });

  const found = await readTaskById("t1", fake.db);
  const missing = await readTaskById("t-missing", fake.db);

  assert.equal(found?.id, "t1");
  assert.equal(missing, null);
});

test("updateTask: deletedAt ありは更新されず null", async () => {
  const fake = createFakeFirestoreDb({
    tasks: {
      t1: {
        houseId: "h1",
        name: "掃除",
        category: "共用部の掃除",
        points: 2,
        frequencyDays: 7,
        deletedAt: "2026-03-01T00:00:00.000Z",
      },
    },
  });

  const updated = await updateTask(
    "t1",
    {
      name: "更新後",
      category: "共用部の掃除",
      points: 4,
      frequencyDays: 1,
    },
    fake.db
  );

  assert.equal(updated, null);
  assert.equal(fake.calls.update.length, 0);
});

test("updateTaskDeletion: 未削除は削除時刻を更新、既削除は既存を返す", async () => {
  const fake = createFakeFirestoreDb({
    tasks: {
      active: {
        houseId: "h1",
        name: "掃除",
        category: "共用部の掃除",
        points: 2,
        frequencyDays: 7,
        deletedAt: null,
      },
      deleted: {
        houseId: "h1",
        name: "洗濯",
        category: "共用部の掃除",
        points: 1,
        frequencyDays: 7,
        deletedAt: "2026-02-01T00:00:00.000Z",
      },
    },
  });

  const deleted = await updateTaskDeletion("active", "2026-03-05T00:00:00.000Z", fake.db);
  const alreadyDeleted = await updateTaskDeletion("deleted", "2026-03-05T00:00:00.000Z", fake.db);

  assert.equal(deleted?.deletedAt, "2026-03-05T00:00:00.000Z");
  assert.equal(alreadyDeleted?.deletedAt, "2026-02-01T00:00:00.000Z");
});
