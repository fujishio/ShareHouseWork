import test from "node:test";
import assert from "node:assert/strict";
import { createNotice, listNotices, updateNoticeDeletion } from "./notice-store.ts";
import { createFakeFirestoreDb } from "./test-helpers/fake-firestore-db.ts";

test("listNotices: houseId 条件と postedAt desc を設定", async () => {
  const fake = createFakeFirestoreDb({
    notices: {
      n1: {
        houseId: "h1",
        title: "連絡",
        body: "本文",
        postedBy: "あなた",
        postedAt: "2026-03-01T00:00:00.000Z",
        isImportant: false,
        deletedAt: null,
        deletedBy: null,
      },
    },
  });

  const notices = await listNotices("h1", fake.db);

  assert.equal(notices.length, 1);
  assert.equal(fake.calls.where[0]?.field, "houseId");
  assert.equal(fake.calls.orderBy[0]?.field, "postedAt");
});

test("createNotice: deletedAt/deletedBy を null で保存", async () => {
  const fake = createFakeFirestoreDb({ notices: {} });

  const created = await createNotice(
    {
      houseId: "h1",
      title: "お知らせ",
      body: "本文",
      postedBy: "あなた",
      postedAt: "2026-03-01T00:00:00.000Z",
      isImportant: true,
    },
    fake.db
  );

  assert.equal(created.id, "new-1");
  assert.equal(fake.seed.notices?.["new-1"]?.deletedAt, null);
  assert.equal(fake.seed.notices?.["new-1"]?.deletedBy, null);
});

test("updateNoticeDeletion: 初回削除は更新、再削除は既存を返す", async () => {
  const fake = createFakeFirestoreDb({
    notices: {
      active: {
        houseId: "h1",
        title: "A",
        body: "",
        postedBy: "あなた",
        postedAt: "2026-03-01T00:00:00.000Z",
        isImportant: false,
        deletedAt: null,
        deletedBy: null,
      },
      deleted: {
        houseId: "h1",
        title: "B",
        body: "",
        postedBy: "あなた",
        postedAt: "2026-03-01T00:00:00.000Z",
        isImportant: false,
        deletedAt: "2026-03-01T00:00:00.000Z",
        deletedBy: "あなた",
      },
    },
  });

  const deleted = await updateNoticeDeletion(
    "active",
    "あなた",
    "2026-03-05T00:00:00.000Z",
    fake.db
  );
  const already = await updateNoticeDeletion(
    "deleted",
    "あなた",
    "2026-03-05T00:00:00.000Z",
    fake.db
  );

  assert.equal(deleted?.deletedAt, "2026-03-05T00:00:00.000Z");
  assert.equal(already?.deletedAt, "2026-03-01T00:00:00.000Z");
});
