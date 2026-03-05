import test from "node:test";
import assert from "node:assert/strict";
import {
  addCollectionDoc,
  createCollectionDoc,
  listCollection,
  readCollection,
  readCollectionDoc,
  updateCollectionDoc,
} from "./store-utils.ts";
import { createFakeFirestoreDb } from "./test-helpers/fake-firestore-db.ts";

test("listCollection: where/orderBy/startAfter/limit を適用して mapDoc する", async () => {
  const fake = createFakeFirestoreDb({
    tasks: {
      t1: { name: "掃除" },
      t2: { name: "洗濯" },
    },
  });

  const items = await listCollection({
    db: fake.db,
    collection: "tasks",
    where: [{ field: "houseId", op: "==", value: "h1" }],
    orderBy: [{ field: "createdAt", direction: "desc" }],
    startAfter: ["cursor-1"],
    limit: 1,
    mapDoc: (id, data) => ({ id, name: String(data.name) }),
  });

  assert.equal(items.length, 1);
  assert.deepEqual(items[0], { id: "t1", name: "掃除" });
  assert.equal(fake.calls.where.length, 1);
  assert.equal(fake.calls.orderBy.length, 1);
  assert.equal(fake.calls.startAfter.length, 1);
  assert.equal(fake.calls.limit.length, 1);
});

test("readCollection: whereEquals を == 条件に変換する", async () => {
  const fake = createFakeFirestoreDb({ users: { u1: { name: "A" } } });

  const users = await readCollection({
    db: fake.db,
    collection: "users",
    whereEquals: [{ field: "houseId", value: "h1" }],
    orderBy: { field: "name", direction: "asc" },
    mapDoc: (id, data) => ({ id, name: String(data.name) }),
  });

  assert.equal(users.length, 1);
  assert.equal(fake.calls.where[0]?.op, "==");
  assert.equal(fake.calls.where[0]?.field, "houseId");
  assert.equal(fake.calls.orderBy[0]?.field, "name");
});

test("createCollectionDoc / addCollectionDoc: ドキュメントを追加して mapDoc を返す", async () => {
  const fake = createFakeFirestoreDb({ rules: {} });

  const created = await createCollectionDoc({
    db: fake.db,
    collection: "rules",
    data: { title: "静かに" },
    mapDoc: (id, data) => ({ id, title: String(data.title) }),
  });

  const added = await addCollectionDoc({
    db: fake.db,
    collection: "rules",
    data: { title: "掃除当番" },
    mapDoc: (id, data) => ({ id, title: String(data.title) }),
  });

  assert.equal(created.id, "new-1");
  assert.equal(added.id, "new-2");
  assert.equal(fake.calls.add.length, 2);
  assert.equal(fake.seed.rules?.["new-2"]?.title, "掃除当番");
});

test("updateCollectionDoc: 対象なしは null", async () => {
  const fake = createFakeFirestoreDb({ tasks: {} });

  const updated = await updateCollectionDoc({
    db: fake.db,
    collection: "tasks",
    id: "missing",
    shouldUpdate: () => true,
    updates: { name: "更新" },
    mapDoc: (id, data) => ({ id, name: String(data.name) }),
  });

  assert.equal(updated, null);
  assert.equal(fake.calls.update.length, 0);
});

test("updateCollectionDoc: ガード失敗時に return-existing を返せる", async () => {
  const fake = createFakeFirestoreDb({ tasks: { t1: { name: "掃除", locked: true } } });

  const updated = await updateCollectionDoc({
    db: fake.db,
    collection: "tasks",
    id: "t1",
    shouldUpdate: () => false,
    onGuardFail: "return-existing",
    updates: { name: "更新後" },
    mapDoc: (id, data) => ({ id, name: String(data.name) }),
  });

  assert.deepEqual(updated, { id: "t1", name: "掃除" });
  assert.equal(fake.calls.update.length, 0);
});

test("updateCollectionDoc: updates 関数で更新し反映済みデータを返す", async () => {
  const fake = createFakeFirestoreDb({ tasks: { t1: { name: "掃除", points: 1 } } });

  const updated = await updateCollectionDoc({
    db: fake.db,
    collection: "tasks",
    id: "t1",
    shouldUpdate: () => true,
    updates: (data) => ({ points: Number(data.points) + 1 }),
    mapDoc: (id, data) => ({ id, points: Number(data.points) }),
  });

  assert.deepEqual(updated, { id: "t1", points: 2 });
  assert.equal(fake.calls.update.length, 1);
  assert.equal(fake.seed.tasks?.t1?.points, 2);
});

test("readCollectionDoc: 存在時は mapDoc、不存在時は null", async () => {
  const fake = createFakeFirestoreDb({ notices: { n1: { title: "連絡" } } });

  const found = await readCollectionDoc({
    db: fake.db,
    collection: "notices",
    id: "n1",
    mapDoc: (id, data) => ({ id, title: String(data.title) }),
  });
  const missing = await readCollectionDoc({
    db: fake.db,
    collection: "notices",
    id: "n-missing",
    mapDoc: (id, data) => ({ id, title: String(data.title) }),
  });

  assert.deepEqual(found, { id: "n1", title: "連絡" });
  assert.equal(missing, null);
});
