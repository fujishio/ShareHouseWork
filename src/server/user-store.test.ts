import test from "node:test";
import assert from "node:assert/strict";
import {
  createOrUpdateUser,
  deleteUserById,
  listUsers,
  readUserById,
} from "./user-store.ts";
import { createFakeFirestoreDb } from "./test-helpers/fake-firestore-db.ts";

test("readUserById: スキーマ不一致は null", async () => {
  const fake = createFakeFirestoreDb({ users: { u1: { name: 123, color: "blue" } } });
  const user = await readUserById("u1", fake.db);
  assert.equal(user, null);
});

test("listUsers: 空 memberUids は即空配列", async () => {
  const fake = createFakeFirestoreDb({ users: { u1: { name: "A", color: "blue" } } });
  const users = await listUsers([], fake.db);
  assert.deepEqual(users, []);
});

test("listUsers: memberUids 指定時は in クエリを組む", async () => {
  const fake = createFakeFirestoreDb({
    users: {
      u1: { name: "A", color: "blue", email: "a@example.com" },
      u2: { name: "B", color: "red", email: "b@example.com" },
    },
  });

  const users = await listUsers(["u1", "u2"], fake.db);

  assert.equal(users.length, 2);
  assert.equal(fake.calls.where[0]?.op, "in");
});

test("createOrUpdateUser / deleteUserById: set(merge) と delete を実行", async () => {
  const fake = createFakeFirestoreDb({ users: {} });

  const upserted = await createOrUpdateUser(
    "u1",
    { name: "A", color: "blue", email: "a@example.com" },
    fake.db
  );
  await deleteUserById("u1", fake.db);

  assert.equal(upserted.id, "u1");
  assert.equal(fake.calls.set.length, 1);
  assert.equal(fake.calls.set[0]?.merge, true);
  assert.equal(fake.calls.delete.length, 1);
});
