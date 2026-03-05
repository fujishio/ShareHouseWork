import test from "node:test";
import assert from "node:assert/strict";
import {
  createHouse,
  listHousesByMemberUid,
  readFirstHouseId,
  readHouseById,
  readHouseByNameAndJoinPassword,
  updateHouseHostRoleGrant,
  updateHouseHostRoleRevoke,
  updateHouseMemberAddition,
} from "./house-store.ts";
import { TASK_CATEGORIES } from "../shared/constants/task.ts";
import { TASK_DEFINITIONS } from "../domain/tasks/task-definitions.ts";
import { createFakeFirestoreDb } from "./test-helpers/fake-firestore-db.ts";

function countDefaultTasks() {
  return TASK_CATEGORIES.reduce((sum, category) => sum + TASK_DEFINITIONS[category].length, 0);
}

test("createHouse: owner 付きで house とデフォルト tasks を作成", async () => {
  const fake = createFakeFirestoreDb({ houses: {}, tasks: {} });

  const created = await createHouse(
    {
      name: "シェアハウスA",
      description: "説明",
      ownerUid: "u1",
    },
    fake.db
  );

  assert.equal(created.name, "シェアハウスA");
  assert.deepEqual(created.memberUids, ["u1"]);
  assert.deepEqual(created.hostUids, ["u1"]);
  assert.equal(Object.keys(fake.seed.tasks ?? {}).length, countDefaultTasks());
});

test("createHouse + readHouseByNameAndJoinPassword: joinPassword で照合できる", async () => {
  const fake = createFakeFirestoreDb({ houses: {}, tasks: {} });
  const created = await createHouse(
    {
      name: "シェアハウスB",
      ownerUid: "u1",
      joinPassword: "secret123",
    },
    fake.db
  );

  const found = await readHouseByNameAndJoinPassword("シェアハウスB", "secret123", fake.db);

  assert.equal(found?.id, created.id);
});

test("read/list/update house 系: 基本分岐が動作", async () => {
  const fake = createFakeFirestoreDb({
    houses: {
      h1: {
        name: "A",
        description: "",
        ownerUid: "u1",
        memberUids: ["u1"],
        hostUids: ["u1"],
        createdAt: "2026-03-01T00:00:00.000Z",
      },
    },
    tasks: {},
  });

  const house = await readHouseById("h1", fake.db);
  const listed = await listHousesByMemberUid("u1", fake.db);
  const added = await updateHouseMemberAddition("h1", "u2", fake.db);
  const granted = await updateHouseHostRoleGrant("h1", "u2", fake.db);
  const revoked = await updateHouseHostRoleRevoke("h1", "u2", fake.db);

  assert.equal(house?.id, "h1");
  assert.equal(listed.length, 1);
  assert.deepEqual(added?.memberUids, ["u1", "u2"]);
  assert.deepEqual(granted?.hostUids, ["u1", "u2"]);
  assert.deepEqual(revoked?.hostUids, ["u1"]);
});

test("updateHouseHostRoleRevoke: 最後の host は削除不可", async () => {
  const fake = createFakeFirestoreDb({
    houses: {
      h1: {
        name: "A",
        description: "",
        ownerUid: "u1",
        memberUids: ["u1"],
        hostUids: ["u1"],
        createdAt: "2026-03-01T00:00:00.000Z",
      },
    },
    tasks: {},
  });

  const revoked = await updateHouseHostRoleRevoke("h1", "u1", fake.db);
  assert.equal(revoked, null);
});

test("readFirstHouseId: 空なら null、存在時は先頭 id", async () => {
  const empty = createFakeFirestoreDb({ houses: {}, tasks: {} });
  const seeded = createFakeFirestoreDb({
    houses: {
      h1: {
        name: "A",
        description: "",
        ownerUid: "u1",
        memberUids: ["u1"],
        hostUids: ["u1"],
        createdAt: "2026-03-01T00:00:00.000Z",
      },
    },
    tasks: {},
  });

  assert.equal(await readFirstHouseId(empty.db), null);
  assert.equal(await readFirstHouseId(seeded.db), "h1");
});
