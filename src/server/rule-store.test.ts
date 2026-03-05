import test from "node:test";
import assert from "node:assert/strict";
import {
  acknowledgeRule,
  createRule,
  listRules,
  updateRule,
  updateRuleDeletion,
} from "./rule-store.ts";
import { createFakeFirestoreDb } from "./test-helpers/fake-firestore-db.ts";

test("listRules: houseId 条件と createdAt desc を設定", async () => {
  const fake = createFakeFirestoreDb({
    rules: {
      r1: {
        houseId: "h1",
        title: "静かに",
        body: "",
        category: "共用部",
        createdBy: "あなた",
        createdAt: "2026-03-01T00:00:00.000Z",
        updatedAt: null,
        acknowledgedBy: [],
        deletedAt: null,
        deletedBy: null,
      },
    },
  });

  const rules = await listRules("h1", fake.db);

  assert.equal(rules.length, 1);
  assert.equal(fake.calls.where[0]?.field, "houseId");
  assert.equal(fake.calls.orderBy[0]?.field, "createdAt");
});

test("createRule: 初期値を設定して作成", async () => {
  const fake = createFakeFirestoreDb({ rules: {} });

  const created = await createRule(
    {
      houseId: "h1",
      title: "掃除当番",
      body: "",
      category: "共用部",
      createdBy: "あなた",
      createdAt: "2026-03-01T00:00:00.000Z",
    },
    fake.db
  );

  assert.equal(created.id, "new-1");
  assert.deepEqual(fake.seed.rules?.["new-1"]?.acknowledgedBy, []);
  assert.equal(fake.seed.rules?.["new-1"]?.updatedAt, null);
  assert.equal(fake.seed.rules?.["new-1"]?.deletedAt, null);
});

test("updateRule: deletedAt ありは更新されず null", async () => {
  const fake = createFakeFirestoreDb({
    rules: {
      r1: {
        houseId: "h1",
        title: "A",
        body: "",
        category: "共用部",
        createdBy: "あなた",
        createdAt: "2026-03-01T00:00:00.000Z",
        updatedAt: null,
        acknowledgedBy: [],
        deletedAt: "2026-03-02T00:00:00.000Z",
        deletedBy: "あなた",
      },
    },
  });

  const updated = await updateRule(
    "r1",
    { title: "B", body: "", category: "共用部", updatedAt: "2026-03-05T00:00:00.000Z" },
    fake.db
  );

  assert.equal(updated, null);
});

test("acknowledgeRule: 未読なら追加、既読なら重複追加しない", async () => {
  const fake = createFakeFirestoreDb({
    rules: {
      r1: {
        houseId: "h1",
        title: "A",
        body: "",
        category: "共用部",
        createdBy: "あなた",
        createdAt: "2026-03-01T00:00:00.000Z",
        updatedAt: null,
        acknowledgedBy: [],
        deletedAt: null,
        deletedBy: null,
      },
    },
  });

  const first = await acknowledgeRule("r1", "あなた", fake.db);
  const second = await acknowledgeRule("r1", "あなた", fake.db);

  assert.deepEqual(first?.acknowledgedBy, ["あなた"]);
  assert.deepEqual(second?.acknowledgedBy, ["あなた"]);
  assert.equal(fake.calls.update.length, 1);
});

test("updateRuleDeletion: 初回削除は更新、再削除は既存を返す", async () => {
  const fake = createFakeFirestoreDb({
    rules: {
      active: {
        houseId: "h1",
        title: "A",
        body: "",
        category: "共用部",
        createdBy: "あなた",
        createdAt: "2026-03-01T00:00:00.000Z",
        updatedAt: null,
        acknowledgedBy: [],
        deletedAt: null,
        deletedBy: null,
      },
      deleted: {
        houseId: "h1",
        title: "B",
        body: "",
        category: "共用部",
        createdBy: "あなた",
        createdAt: "2026-03-01T00:00:00.000Z",
        updatedAt: null,
        acknowledgedBy: [],
        deletedAt: "2026-03-01T00:00:00.000Z",
        deletedBy: "あなた",
      },
    },
  });

  const deleted = await updateRuleDeletion("active", "あなた", "2026-03-05T00:00:00.000Z", fake.db);
  const already = await updateRuleDeletion("deleted", "あなた", "2026-03-05T00:00:00.000Z", fake.db);

  assert.equal(deleted?.deletedAt, "2026-03-05T00:00:00.000Z");
  assert.equal(already?.deletedAt, "2026-03-01T00:00:00.000Z");
});
